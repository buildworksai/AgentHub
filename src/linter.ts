import * as vscode from 'vscode';
import { minimatch } from 'minimatch';
import { RulesLoader, Rule } from './rulesLoader';

export class Linter {
	private diagnosticCollection: vscode.DiagnosticCollection;

	constructor(
		private rulesLoader: RulesLoader,
		private outputChannel: vscode.OutputChannel
	) {
		this.diagnosticCollection = vscode.languages.createDiagnosticCollection('agent-rules');
	}

	lint(document: vscode.TextDocument): void {
		const diagnostics: vscode.Diagnostic[] = [];
		const rules = this.rulesLoader.getRules();

		if (rules.length === 0) {
			// No rules to enforce
			this.diagnosticCollection.set(document.uri, diagnostics);
			return;
		}

		const text = document.getText();
		const filePath = document.uri.fsPath;
		const languageId = document.languageId;

		for (const rule of rules) {
			// Check if rule applies to this file
			if (!this.shouldApplyRule(rule, filePath, languageId)) {
				continue;
			}

			// Apply regex matching
			try {
				const regex = new RegExp(
					rule.match.regex,
					rule.match.flags || 'g'
				);

				let match: RegExpExecArray | null;
				while ((match = regex.exec(text)) !== null) {
					const startPos = document.positionAt(match.index);
					const endPos = document.positionAt(match.index + match[0].length);
					const range = new vscode.Range(startPos, endPos);

					const diagnostic = new vscode.Diagnostic(
						range,
						rule.message,
						this.getSeverity(rule.severity)
					);

					diagnostic.code = rule.id;
					diagnostic.source = 'agent-rules';

					diagnostics.push(diagnostic);
				}
			} catch (err) {
				this.outputChannel.appendLine(
					`Error applying rule ${rule.id}: ${err}`
				);
			}
		}

		this.diagnosticCollection.set(document.uri, diagnostics);
	}

	clear(): void {
		this.diagnosticCollection.clear();
	}

	dispose(): void {
		this.diagnosticCollection.dispose();
	}

	getDiagnosticsForDocument(document: vscode.TextDocument): vscode.Diagnostic[] {
		const diagnostics = this.diagnosticCollection.get(document.uri);
		return diagnostics ? [...diagnostics] : [];
	}

	private shouldApplyRule(rule: Rule, filePath: string, languageId: string): boolean {
		// Check language filter
		if (rule.match.languages && rule.match.languages.length > 0) {
			if (!rule.match.languages.includes(languageId)) {
				return false;
			}
		}

		// Check path exclusions (takes priority)
		if (rule.match.pathExclude && rule.match.pathExclude.length > 0) {
			for (const pattern of rule.match.pathExclude) {
				if (minimatch(filePath, pattern)) {
					return false;
				}
			}
		}

		// Check path inclusions
		if (rule.match.pathInclude && rule.match.pathInclude.length > 0) {
			let matched = false;
			for (const pattern of rule.match.pathInclude) {
				if (minimatch(filePath, pattern)) {
					matched = true;
					break;
				}
			}
			if (!matched) {
				return false;
			}
		}

		return true;
	}

	private getSeverity(severity: 'error' | 'warn' | 'info'): vscode.DiagnosticSeverity {
		switch (severity) {
			case 'error':
				return vscode.DiagnosticSeverity.Error;
			case 'warn':
				return vscode.DiagnosticSeverity.Warning;
			case 'info':
				return vscode.DiagnosticSeverity.Information;
			default:
				return vscode.DiagnosticSeverity.Warning;
		}
	}
}
