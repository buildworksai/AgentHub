import * as vscode from 'vscode';
import { RulesLoader, Rule } from './rulesLoader';

export class AgentRulesCodeActionProvider implements vscode.CodeActionProvider {
	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	constructor(private rulesLoader: RulesLoader) {}

	provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext,
		token: vscode.CancellationToken
	): vscode.CodeAction[] | undefined {
		const codeActions: vscode.CodeAction[] = [];

		// Filter diagnostics from agent-rules
		const agentRuleDiagnostics = context.diagnostics.filter(
			d => d.source === 'agent-rules'
		);

		for (const diagnostic of agentRuleDiagnostics) {
			const ruleId = diagnostic.code as string;
			if (!ruleId) {
				continue;
			}

			// Find the rule
			const rule = this.rulesLoader.getRules().find(r => r.id === ruleId);
			if (!rule || !rule.fix) {
				continue;
			}

			// Create quick fix action
			const action = this.createFixAction(document, diagnostic, rule);
			if (action) {
				codeActions.push(action);
			}
		}

		return codeActions;
	}

	private createFixAction(
		document: vscode.TextDocument,
		diagnostic: vscode.Diagnostic,
		rule: Rule
	): vscode.CodeAction | undefined {
		if (!rule.fix) {
			return undefined;
		}

		const fix = rule.fix;
		const action = new vscode.CodeAction(
			`Fix: ${rule.message}`,
			vscode.CodeActionKind.QuickFix
		);

		action.diagnostics = [diagnostic];
		action.isPreferred = true;

		const edit = new vscode.WorkspaceEdit();

		switch (fix.kind) {
			case 'replace':
				if (fix.replaceWith !== undefined) {
					edit.replace(
						document.uri,
						diagnostic.range,
						fix.replaceWith
					);
				}
				break;

			case 'delete':
				edit.delete(document.uri, diagnostic.range);
				break;

			case 'insert':
				if (fix.insertText !== undefined) {
					const position = fix.position === 'end'
						? diagnostic.range.end
						: diagnostic.range.start;
					edit.insert(document.uri, position, fix.insertText);
				}
				break;

			default:
				return undefined;
		}

		action.edit = edit;
		return action;
	}
}
