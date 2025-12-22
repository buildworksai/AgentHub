import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

export interface RuleFix {
	kind: 'replace' | 'insert' | 'delete';
	replaceWith?: string;
	insertText?: string;
	position?: 'start' | 'end';
}

export interface RuleMatch {
	languages?: string[];
	regex: string;
	flags?: string;
	pathInclude?: string[];
	pathExclude?: string[];
}

export interface Rule {
	id: string;
	severity: 'error' | 'warn' | 'info';
	message: string;
	match: RuleMatch;
	fix?: RuleFix;
}

interface RulesFileContent {
	version?: number;
	rules: Rule[];
}

export class RulesLoader {
	private rules: Rule[] = [];
	private lastGoodRules: Rule[] = [];
	private hasShownMissingFolderInfo = false;

	constructor(private outputChannel: vscode.OutputChannel) {}

	getRules(): Rule[] {
		return this.rules;
	}

	loadRules(workspaceRoot: string): void {
		const rulesDir = path.join(workspaceRoot, '.agent', 'rules');

		// Check if rules directory exists
		if (!fs.existsSync(rulesDir)) {
			if (!this.hasShownMissingFolderInfo) {
				this.outputChannel.appendLine(
					`Rules folder not found: ${rulesDir}`
				);
				vscode.window.showInformationMessage(
					'Agent Rules: .agent/rules folder not found. Use "Agent Rules: Open Rules Folder" to create it.'
				);
				this.hasShownMissingFolderInfo = true;
			}
			this.rules = [];
			return;
		}

		this.outputChannel.appendLine(`Loading rules from: ${rulesDir}`);

		// Clear existing rules
		const newRules: Rule[] = [];

		try {
			// Read all files in the rules directory (including nested)
			this.loadRulesFromDirectory(rulesDir, newRules);

			// Update rules
			this.rules = newRules;
			this.lastGoodRules = [...newRules];

			this.outputChannel.appendLine(
				`Successfully loaded ${this.rules.length} rules`
			);
		} catch (err) {
			this.outputChannel.appendLine(`Error loading rules: ${err}`);
			// Keep last known good rules
			this.rules = this.lastGoodRules;
			vscode.window.showErrorMessage(
				'Agent Rules: Error loading rules. Using last known good configuration.'
			);
		}
	}

	private loadRulesFromDirectory(dir: string, rules: Rule[]): void {
		if (!fs.existsSync(dir)) {
			return;
		}

		const entries = fs.readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				// Recursively load from subdirectories
				this.loadRulesFromDirectory(fullPath, rules);
			} else if (entry.isFile()) {
				// Load rules from file
				this.loadRulesFromFile(fullPath, rules);
			}
		}
	}

	private loadRulesFromFile(filePath: string, rules: Rule[]): void {
		const ext = path.extname(filePath).toLowerCase();
		
		try {
			const content = fs.readFileSync(filePath, 'utf8');

			if (ext === '.yaml' || ext === '.yml') {
				this.parseYamlRules(filePath, content, rules);
			} else if (ext === '.json') {
				this.parseJsonRules(filePath, content, rules);
			} else if (ext === '.md' || ext === '.txt' || ext === '') {
				this.parseTextRules(filePath, content, rules);
			} else {
				this.outputChannel.appendLine(
					`Skipping unsupported file type: ${filePath}`
				);
			}
		} catch (err) {
			this.outputChannel.appendLine(
				`Error reading file ${filePath}: ${err}`
			);
		}
	}

	private parseYamlRules(filePath: string, content: string, rules: Rule[]): void {
		try {
			const data = yaml.parse(content) as RulesFileContent;
			
			if (!data || !data.rules || !Array.isArray(data.rules)) {
				this.outputChannel.appendLine(
					`Warning: ${filePath} does not contain a valid rules array`
				);
				return;
			}

			for (const rule of data.rules) {
				if (this.isValidRule(rule)) {
					rules.push(rule);
				} else {
					this.outputChannel.appendLine(
						`Warning: Invalid rule in ${filePath}: ${JSON.stringify(rule)}`
					);
				}
			}
		} catch (err) {
			this.outputChannel.appendLine(
				`Error parsing YAML file ${filePath}: ${err}`
			);
			throw err;
		}
	}

	private parseJsonRules(filePath: string, content: string, rules: Rule[]): void {
		try {
			const data = JSON.parse(content) as RulesFileContent;
			
			if (!data || !data.rules || !Array.isArray(data.rules)) {
				this.outputChannel.appendLine(
					`Warning: ${filePath} does not contain a valid rules array`
				);
				return;
			}

			for (const rule of data.rules) {
				if (this.isValidRule(rule)) {
					rules.push(rule);
				} else {
					this.outputChannel.appendLine(
						`Warning: Invalid rule in ${filePath}: ${JSON.stringify(rule)}`
					);
				}
			}
		} catch (err) {
			this.outputChannel.appendLine(
				`Error parsing JSON file ${filePath}: ${err}`
			);
			throw err;
		}
	}

	private parseTextRules(filePath: string, content: string, rules: Rule[]): void {
		const lines = content.split('\n');
		const fileName = path.basename(filePath);
		let lineNumber = 0;

		for (const line of lines) {
			lineNumber++;
			const trimmed = line.trim();

			// Skip comments and blank lines
			if (trimmed === '' || trimmed.startsWith('#')) {
				continue;
			}

			// Parse rule line: SEVERITY: <message> :: <regex>
			const match = trimmed.match(/^(error|warn|info):\s*(.+?)\s*::\s*(.+)$/i);
			
			if (match) {
				const [, severity, message, regex] = match;
				
				const rule: Rule = {
					id: `${fileName}-line${lineNumber}`,
					severity: severity.toLowerCase() as 'error' | 'warn' | 'info',
					message: message.trim(),
					match: {
						regex: regex.trim()
					}
				};

				rules.push(rule);
			} else if (trimmed.includes('::')) {
				// Has :: but no severity - default to warn
				const parts = trimmed.split('::');
				if (parts.length === 2) {
					const rule: Rule = {
						id: `${fileName}-line${lineNumber}`,
						severity: 'warn',
						message: parts[0].trim(),
						match: {
							regex: parts[1].trim()
						}
					};
					rules.push(rule);
				} else {
					this.outputChannel.appendLine(
						`Warning: Invalid rule format at ${filePath}:${lineNumber}: ${trimmed}`
					);
				}
			} else {
				this.outputChannel.appendLine(
					`Warning: Skipping line without :: separator at ${filePath}:${lineNumber}: ${trimmed}`
				);
			}
		}
	}

	private isValidRule(rule: any): rule is Rule {
		return (
			rule &&
			typeof rule === 'object' &&
			typeof rule.id === 'string' &&
			(rule.severity === 'error' || rule.severity === 'warn' || rule.severity === 'info') &&
			typeof rule.message === 'string' &&
			rule.match &&
			typeof rule.match === 'object' &&
			typeof rule.match.regex === 'string'
		);
	}
}
