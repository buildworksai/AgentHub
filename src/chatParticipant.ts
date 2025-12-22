import { describe, it } from 'mocha';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function registerChatParticipant(context: vscode.ExtensionContext): void {
	const participant = vscode.chat.createChatParticipant(
		'agenthub.agent',
		async (
			request: vscode.ChatRequest,
			context: vscode.ChatContext,
			stream: vscode.ChatResponseStream,
			token: vscode.CancellationToken
		) => {
			try {
				// Get workspace root
				const workspaceFolders = vscode.workspace.workspaceFolders;
				if (!workspaceFolders || workspaceFolders.length === 0) {
					stream.markdown('❌ No workspace folder open. AgentHub requires a workspace.');
					return;
				}

				const workspaceRoot = workspaceFolders[0].uri.fsPath;
				const commandsDir = path.join(workspaceRoot, '.agent', 'commands');

				// Check if commands directory exists
				if (!fs.existsSync(commandsDir)) {
					stream.markdown('❌ No `.agent/commands` folder found. AgentHub will initialize the structure on next activation.');
					return;
				}

				// Get all available command files
				const availableCommands = fs.readdirSync(commandsDir)
					.filter((file: string) => file.endsWith('.md'))
					.map((file: string) => path.basename(file, '.md'));

				   // --- @token resolution (post-submit, no picker) ---
				   const initialPrompt = request.prompt;
				   let normalizedPrompt = initialPrompt;
				   // Keep atTokens in outer scope so we can optionally expand file contents later
				   let atTokens: string[] = [...normalizedPrompt.matchAll(/(?:^|\s)@([^\s@\/]+)/g)].map(m => m[1]);
				   if (atTokens.length > 0) {
					   const unresolved: string[] = [];
					   const ambiguous: { token: string, matches: string[] }[] = [];
					   const resolutions: { token: string, match: string }[] = [];
					   for (const token of atTokens) {
						   // Use VS Code API to find files matching token
						   const uris = await vscode.workspace.findFiles(`**/*${token}*`, '**/{node_modules,.git,dist,build,out}/**', 10);
						   const rels = uris.map(u => vscode.workspace.asRelativePath(u));
						   if (rels.length === 0) {
							   unresolved.push(token);
						   } else if (rels.length > 1) {
							   ambiguous.push({ token, matches: rels });
						   } else {
							   resolutions.push({ token, match: rels[0] });
						   }
					   }
					   if (unresolved.length > 0) {
						   stream.markdown(`❌ Unresolved @ reference(s): ${unresolved.map(t => '`@' + t + '`').join(', ')}\n\nPlease check the token(s) and try again.`);
						   return;
					   }
					   if (ambiguous.length > 0) {
						   const lines = ambiguous.map(r => `@${r.token}:\n${r.matches.map(m => `  - ${m}`).join('\n')}`).join('\n\n');
						   stream.markdown(`⚠️ Ambiguous @ reference(s) found. Please refine your prompt:\n\n${lines}`);
						   return;
					   }
					   // Rewrite prompt: replace @token with @relative/path (token-bounded)
					   for (const r of resolutions) {
						   normalizedPrompt = normalizedPrompt.replace(new RegExp(`(^|\\s)@${r.token}(?=$|\\s)`, 'g'), `$1@${r.match}`);
					   }
					   atTokens = [...normalizedPrompt.matchAll(/(?:^|\s)@([^\s@\/]+)/g)].map(m => m[1]);
				   }

				   // Determine command to load
				   // Determine command to load
				   const commandName: string | undefined = request.command
					   ? request.command
					   : (() => {
						   const promptLower = normalizedPrompt.toLowerCase();
						   const matches = [...promptLower.matchAll(/(?:^|\s)\/([\w-]+)/g)];
						   const last = matches.at(-1);
						   const extractedCommand = last?.[1];
						   if (extractedCommand && availableCommands.includes(extractedCommand)) {
							   return extractedCommand;
						   }
						   return undefined;
					   })();

				// If no command found, show available commands
				if (!commandName) {
					stream.markdown('## AgentHub Commands\n\n');
					stream.markdown('Available slash commands:\n\n');
					availableCommands.forEach(cmd => {
						stream.markdown(`- \`/${cmd}\`\n`);
					});
					stream.markdown('\n**Usage:** Type `@agenthub /commandName` to load a command.\n\n');
					stream.markdown('*AgentHub - Your AI Agent Command Center*');
					return;
				}
				// Validate command exists
				if (!availableCommands.includes(commandName)) {
					stream.markdown(`❌ Command \`/${commandName}\` not found.\n\n**Available commands:** ${availableCommands.map(c => `\`/${c}\``).join(', ')}`);
					return;
				}

				// Load and use command content
				const commandFile = `${commandName}.md`;
				const commandPath = path.join(commandsDir, commandFile);

				const commandContent = fs.readFileSync(commandPath, 'utf8');

				// Use command as system prompt and send to AI
				const models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
				if (models.length === 0) {
					stream.markdown('❌ No language model available. GitHub Copilot required.');
					return;
				}


				const model = models[0];
				// (Optional) Expand file contents for context (cap 50KB per file)
				const contextMessages: vscode.LanguageModelChatMessage[] = [];
				if (atTokens.length > 0) {
					for (const token of atTokens) {
						const uris = await vscode.workspace.findFiles(`**/*${token}*`, '**/{node_modules,.git,dist,build,out}/**', 10);
						if (uris.length === 1) {
							const absPath = uris[0].fsPath;
							try {
								const fileText = fs.readFileSync(absPath, 'utf8');
								const relPath = vscode.workspace.asRelativePath(absPath);
								contextMessages.push(
									vscode.LanguageModelChatMessage.User(
										`File: ${relPath}\n\n${fileText.slice(0, 50000)}`
									)
								);
							} catch {}
						}
					}
				}
				// Build messages: file context (if any) + command as system context + user's actual prompt (with resolved @tokens)
				const messages = [
					...contextMessages,
					vscode.LanguageModelChatMessage.User(commandContent),
					vscode.LanguageModelChatMessage.User(normalizedPrompt || 'Please respond according to the instructions above.')
				];
				// Send request to AI
				const chatResponse = await model.sendRequest(messages, {}, token);
				// Stream AI response
				for await (const fragment of chatResponse.text) {
					stream.markdown(fragment);
				}

			} catch (error) {
				stream.markdown(`❌ Error loading command: ${error}`);
			}
		}
	);

	// Set participant metadata
	participant.iconPath = new vscode.ThemeIcon('hub');
	
	context.subscriptions.push(participant);
}
