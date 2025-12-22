import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { RulesLoader } from './rulesLoader';
import { Linter } from './linter';
import { AgentRulesCodeActionProvider } from './actions';
import { initializeAgentStructure } from './agentStructure';


const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('AgentHub');
let rulesLoader: RulesLoader;
let linter: Linter;
let rulesWatcher: vscode.FileSystemWatcher | undefined;
const changeDebounceTimers = new Map<string, NodeJS.Timeout>();
let statusBarItem: vscode.StatusBarItem;
let temporarilyDisabled = false;

export async function activate(context: vscode.ExtensionContext) {
	outputChannel.appendLine('═══════════════════════════════════════════════════════');
	outputChannel.appendLine('  AgentHub by BuildWorks.AI');
	outputChannel.appendLine('  Your AI Agent Command Center for VS Code');
	outputChannel.appendLine('  https://buildworks.ai');
	outputChannel.appendLine('═══════════════════════════════════════════════════════');
	outputChannel.appendLine('Activating...');



	// Create status bar item
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	context.subscriptions.push(statusBarItem);
	updateStatusBar();

	// Initialize components
	rulesLoader = new RulesLoader(outputChannel);
	linter = new Linter(rulesLoader, outputChannel);

	// Load rules from .agent/rules
	loadRules();

	// Register code action provider for quick fixes
	const codeActionProvider = new AgentRulesCodeActionProvider(rulesLoader);
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			{ scheme: 'file' },
			codeActionProvider,
			{
				providedCodeActionKinds: AgentRulesCodeActionProvider.providedCodeActionKinds
			}
		)
	);

	// Register save blocking handler
	context.subscriptions.push(
		vscode.workspace.onWillSaveTextDocument(async (event) => {
			await handleSaveBlocking(event);
		})
	);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('agentRules.scanWorkspace', async () => {
			await scanWorkspace();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('agentRules.openRulesFolder', async () => {
			await openRulesFolder();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('agentRules.slashCommand', async () => {
			await showSlashCommandPicker();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('agentRules.enableStrictMode', async () => {
			await enableStrictMode();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('agentRules.disableStrictMode', async () => {
			await disableStrictMode();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('agentRules.toggleSaveBlocking', async () => {
			await toggleSaveBlocking();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('agentRules.temporarilyDisable', async () => {
			temporarilyDisable();
		})
	);

	// Watch for document changes
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(doc => {
			lintDocument(doc);
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(doc => {
			lintDocument(doc);
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(e => {
			const config = vscode.workspace.getConfiguration('agentRules');
			const debounceMs = config.get<number>('debounceMs', 250);
			
			const uri = e.document.uri.toString();
			if (changeDebounceTimers.has(uri)) {
				clearTimeout(changeDebounceTimers.get(uri)!);
			}
			const timer = setTimeout(() => {
				lintDocument(e.document);
				changeDebounceTimers.delete(uri);
			}, debounceMs);
			changeDebounceTimers.set(uri, timer);
		})
	);

	// Watch for configuration changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('agentRules')) {
				updateStatusBar();
				outputChannel.appendLine('Configuration changed, updating settings...');
			}
		})
	);

	// Watch for changes in .agent/rules
	setupRulesWatcher(context);

	// Lint all currently open documents
	vscode.workspace.textDocuments.forEach(doc => {
		lintDocument(doc);
	});

	// Initialize .agent structure on first activation
	await initializeAgentStructure();

	outputChannel.appendLine('\u2713 AgentHub activated successfully');
	outputChannel.appendLine('Built by BuildWorks.AI - Open Source First');
	updateStatusBar();
}

export function deactivate() {
	// Clear all debounce timers
	changeDebounceTimers.forEach(timer => clearTimeout(timer));
	changeDebounceTimers.clear();

	// Dispose rules watcher
	if (rulesWatcher) {
		rulesWatcher.dispose();
	}

	// Clear diagnostics
	if (linter) {
		linter.clear();
	}
}

function loadRules() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		outputChannel.appendLine('No workspace folder found');
		return;
	}

	rulesLoader.loadRules(workspaceFolders[0].uri.fsPath);
}

function setupRulesWatcher(context: vscode.ExtensionContext) {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return;
	}

	// Watch for changes in .agent/rules/**
	const rulesPattern = new vscode.RelativePattern(
		workspaceFolders[0],
		'.agent/rules/**'
	);

	rulesWatcher = vscode.workspace.createFileSystemWatcher(
		rulesPattern,
		false, // create
		false, // change
		false  // delete
	);

	context.subscriptions.push(rulesWatcher);

	// Reload rules and re-lint when rules change
	const reloadAndLint = () => {
		outputChannel.appendLine('Rules changed, reloading...');
		loadRules();
		vscode.workspace.textDocuments.forEach(doc => {
			lintDocument(doc);
		});
	};

	rulesWatcher.onDidCreate(reloadAndLint);
	rulesWatcher.onDidChange(reloadAndLint);
	rulesWatcher.onDidDelete(reloadAndLint);
}

function lintDocument(document: vscode.TextDocument) {
	// Skip non-file schemes and output channels
	if (document.uri.scheme !== 'file') {
		return;
	}

	// Skip files in default ignored folders
	const path = document.uri.fsPath;
	const ignoredPatterns = [
		'**/node_modules/**',
		'**/.git/**',
		'**/dist/**',
		'**/build/**',
		'**/out/**'
	];

	for (const pattern of ignoredPatterns) {
		if (minimatchPath(path, pattern)) {
			return;
		}
	}

	linter.lint(document);
}

async function scanWorkspace() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showInformationMessage('No workspace folder open');
		return;
	}

	outputChannel.appendLine('Scanning workspace...');
	vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Scanning workspace for rule violations',
			cancellable: false
		},
		async () => {
			// Find all files in workspace (cap at 2000)
			const files = await vscode.workspace.findFiles(
				'**/*',
				'{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/out/**}',
				2000
			);

			outputChannel.appendLine(`Found ${files.length} files to scan`);

			for (const fileUri of files) {
				try {
					const doc = await vscode.workspace.openTextDocument(fileUri);
					linter.lint(doc);
				} catch (err) {
					// Skip files that can't be opened as text documents
				}
			}

			outputChannel.appendLine('Workspace scan complete');
			vscode.window.showInformationMessage(
				`AgentHub: Scanned ${files.length} files`
			);
		}
	);
}

async function openRulesFolder() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showInformationMessage('No workspace folder open');
		return;
	}

	const rulesPath = vscode.Uri.joinPath(
		workspaceFolders[0].uri,
		'.agent',
		'rules'
	);

	try {
		// Try to reveal the folder
		await vscode.commands.executeCommand('revealInExplorer', rulesPath);
	} catch {
		// If folder doesn't exist, create it
		try {
			await vscode.workspace.fs.createDirectory(rulesPath);
			outputChannel.appendLine(`Created rules folder: ${rulesPath.fsPath}`);
			vscode.window.showInformationMessage(
				'Created .agent/rules folder'
			);
			await vscode.commands.executeCommand('revealInExplorer', rulesPath);
		} catch (err) {
			outputChannel.appendLine(`Error creating rules folder: ${err}`);
			vscode.window.showErrorMessage(
				'Failed to create .agent/rules folder'
			);
		}
	}
}

// Helper function for minimatch (simple implementation)
function minimatchPath(path: string, pattern: string): boolean {
	// Convert pattern to regex
	const regexPattern = pattern
		.replace(/\*\*/g, '.*')
		.replace(/\*/g, '[^/]*')
		.replace(/\?/g, '.');
	
	const regex = new RegExp(regexPattern);
	return regex.test(path);
}

// Save blocking handler
async function handleSaveBlocking(event: vscode.TextDocumentWillSaveEvent) {
	const config = vscode.workspace.getConfiguration('agentRules');
	const enabled = config.get<boolean>('enabled', true);
	
	if (!enabled || temporarilyDisabled) {
		return;
	}

	const blockOnErrors = config.get<boolean>('blockSaveOnErrors', false);
	const blockOnWarnings = config.get<boolean>('blockSaveOnWarnings', false);
	
	if (!blockOnErrors && !blockOnWarnings) {
		return;
	}

	const diagnostics = linter.getDiagnosticsForDocument(event.document);
	const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
	const warnings = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning);

	const shouldBlock = (blockOnErrors && errors.length > 0) || (blockOnWarnings && warnings.length > 0);
	
	if (!shouldBlock) {
		return;
	}

	const allowOverride = config.get<boolean>('allowSaveOverride', true);
	const requireReason = config.get<boolean>('requireOverrideReason', false);

	event.waitUntil(
		new Promise<void>(async (resolve, reject) => {
			const violationCount = errors.length + warnings.length;
			const message = `Cannot save: ${violationCount} agent-rules violation(s) found`;
			
			const actions = allowOverride 
				? ['Fix Now', 'Override & Save', 'Cancel']
				: ['Fix Now', 'Cancel'];

			const choice = await vscode.window.showErrorMessage(message, ...actions);

			if (choice === 'Fix Now') {
				// Jump to first violation
				if (diagnostics.length > 0) {
					const firstDiag = diagnostics[0];
					const editor = vscode.window.activeTextEditor;
					if (editor) {
						editor.selection = new vscode.Selection(firstDiag.range.start, firstDiag.range.start);
						editor.revealRange(firstDiag.range, vscode.TextEditorRevealType.InCenter);
					}
				}
				reject(new Error('Save cancelled - fix violations'));
			} else if (choice === 'Override & Save') {
				if (requireReason) {
					const reason = await vscode.window.showInputBox({
						prompt: 'Why are you overriding the rules?',
						placeHolder: 'e.g., Hotfix for production issue'
					});
					
					if (!reason) {
						reject(new Error('Save cancelled - reason required'));
						return;
					}
					
					outputChannel.appendLine(`Save override: ${reason} (${violationCount} violations)`);
				}
				resolve();
			} else {
				reject(new Error('Save cancelled'));
			}
		})
	);
}

// Update status bar
function updateStatusBar() {
	const config = vscode.workspace.getConfiguration('agentRules');
	const showStatusBar = config.get<boolean>('showStatusBar', true);
	
	if (!showStatusBar) {
		statusBarItem.hide();
		return;
	}

	const enabled = config.get<boolean>('enabled', true);
	const blockOnErrors = config.get<boolean>('blockSaveOnErrors', false);
	const blockOnWarnings = config.get<boolean>('blockSaveOnWarnings', false);

	if (!enabled || temporarilyDisabled) {
		statusBarItem.text = '$(circle-slash) Agent Rules: Disabled';
		statusBarItem.tooltip = 'Agent Rules Enforcer is disabled';
		statusBarItem.backgroundColor = undefined;
	} else if (blockOnErrors && !config.get<boolean>('allowSaveOverride', true)) {
		statusBarItem.text = '$(shield) Agent Rules: Strict';
		statusBarItem.tooltip = 'Strict mode: Blocking saves on errors (no override)';
		statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
	} else if (blockOnErrors || blockOnWarnings) {
		statusBarItem.text = '$(warning) Agent Rules: Active';
		statusBarItem.tooltip = 'Save blocking enabled';
		statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
	} else {
		statusBarItem.text = '$(info) Agent Rules: Passive';
		statusBarItem.tooltip = 'Diagnostics only';
		statusBarItem.backgroundColor = undefined;
	}

	statusBarItem.show();
}

// Command handlers
async function enableStrictMode() {
	const config = vscode.workspace.getConfiguration('agentRules');
	await config.update('enabled', true, vscode.ConfigurationTarget.Workspace);
	await config.update('blockSaveOnErrors', true, vscode.ConfigurationTarget.Workspace);
	await config.update('allowSaveOverride', true, vscode.ConfigurationTarget.Workspace);
	await config.update('requireOverrideReason', true, vscode.ConfigurationTarget.Workspace);
	
	updateStatusBar();
	vscode.window.showInformationMessage('AgentHub: Strict mode enabled');
}

async function disableStrictMode() {
	const config = vscode.workspace.getConfiguration('agentRules');
	await config.update('blockSaveOnErrors', false, vscode.ConfigurationTarget.Workspace);
	await config.update('blockSaveOnWarnings', false, vscode.ConfigurationTarget.Workspace);
	
	updateStatusBar();
	vscode.window.showInformationMessage('AgentHub: Strict mode disabled (passive mode)');
}

async function toggleSaveBlocking() {
	const config = vscode.workspace.getConfiguration('agentRules');
	const current = config.get<boolean>('blockSaveOnErrors', false);
	await config.update('blockSaveOnErrors', !current, vscode.ConfigurationTarget.Workspace);
	
	updateStatusBar();
	vscode.window.showInformationMessage(
		`AgentHub: Save blocking ${!current ? 'enabled' : 'disabled'}`
	);
}

function temporarilyDisable() {
	temporarilyDisabled = !temporarilyDisabled;
	updateStatusBar();
	vscode.window.showInformationMessage(
		`AgentHub: ${temporarilyDisabled ? 'Temporarily disabled' : 'Re-enabled'} for this session`
	);
}

async function showSlashCommandPicker() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showErrorMessage('No workspace folder open');
		return;
	}

	const workspaceRoot = workspaceFolders[0].uri.fsPath;
	const commandsDir = path.join(workspaceRoot, '.agent', 'commands');

	// Check if commands directory exists
	if (!fs.existsSync(commandsDir)) {
		vscode.window.showErrorMessage('No .agent/commands folder found. Initialize agent structure first.');
		return;
	}

	// Read all .md files from commands directory
	const commandFiles = fs.readdirSync(commandsDir)
		.filter((file: string) => file.endsWith('.md'))
		.map((file: string) => path.join(commandsDir, file));

	if (commandFiles.length === 0) {
		vscode.window.showErrorMessage('No command files (.md) found in .agent/commands/');
		return;
	}

	// Create quick pick items
	interface CommandQuickPickItem extends vscode.QuickPickItem {
		filePath: string;
		content: string;
	}

	const items: CommandQuickPickItem[] = commandFiles.map((filePath: string) => {
		const content = fs.readFileSync(filePath, 'utf8');
		const fileName = path.basename(filePath, '.md');
		
		// Extract first line (after # if present) as description
		const lines = content.split('\n').filter((l: string) => l.trim());
		const firstLine = lines[0]?.replace(/^#\s*/, '') || fileName;
		const description = lines[1]?.substring(0, 60) || 'Agent command';

		return {
			label: `$(terminal) ${fileName}`,
			description: description,
			detail: filePath,
			filePath: filePath,
			content: content
		};
	});

	// Show quick pick
	const selected = await vscode.window.showQuickPick(items, {
		placeHolder: 'Select an agent command to execute',
		matchOnDescription: true,
		matchOnDetail: true
	});

	if (selected) {
		// Copy command content to clipboard for easy pasting into chat
		await vscode.env.clipboard.writeText(selected.content);
		
		vscode.window.showInformationMessage(
			`Command "${path.basename(selected.filePath, '.md')}" copied to clipboard. Paste in your AI agent chat.`,
			'Open File'
		).then(action => {
			if (action === 'Open File') {
				vscode.workspace.openTextDocument(selected.filePath).then(doc => {
					vscode.window.showTextDocument(doc);
				});
			}
		});
	}
}

