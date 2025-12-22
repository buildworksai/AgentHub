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

				// Determine command to load
				let commandName: string | undefined;
				
				// If request.command is provided (from registered slash commands), use it
				if (request.command) {
					commandName = request.command;
				} else {
					// Try to extract command from prompt (e.g., "/approval" or "approval")
					const promptLower = request.prompt.toLowerCase().trim();
					const match = promptLower.match(/^\/?([\w-]+)/);
					if (match) {
						const extracted = match[1];
						// Check if it matches an available command
						if (availableCommands.includes(extracted)) {
							commandName = extracted;
						}
					}
				}

				// If no command found, show available commands
				if (!commandName) {
					stream.markdown('## AgentHub Commands\n\n');
					stream.markdown('Available slash commands:\n\n');
					availableCommands.forEach(cmd => {
						stream.markdown(`- \`/${cmd}\`\n`);
					});
					stream.markdown('\n**Usage:** Type `@agent /commandName` to load a command.\n\n');
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
				
				// Build messages: command as system context + user's actual prompt
				const messages = [
					vscode.LanguageModelChatMessage.User(commandContent),
					vscode.LanguageModelChatMessage.User(request.prompt || 'Please respond according to the instructions above.')
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
