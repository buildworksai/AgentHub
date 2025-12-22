import * as vscode from 'vscode';

export class WebviewChatPanel {
    public static currentPanel: WebviewChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        // If we already have a panel, show it.
        if (WebviewChatPanel.currentPanel) {
            WebviewChatPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            'agentHubChat',
            'AgentHub Chat',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        WebviewChatPanel.currentPanel = new WebviewChatPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._panel.webview.html = this._getHtmlForWebview();

        this._panel.onDidDispose(() => this.dispose(), null);
    }

    public dispose() {
        WebviewChatPanel.currentPanel = undefined;
        this._panel.dispose();
    }

    private _getHtmlForWebview(): string {
        // Simple placeholder UI
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AgentHub Chat</title>
                <style>
                    body { font-family: var(--vscode-font-family, sans-serif); margin: 0; padding: 0; background: var(--vscode-editor-background, #1e1e1e); color: var(--vscode-editor-foreground, #d4d4d4); }
                    .container { padding: 2rem; }
                    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
                    .info { color: var(--vscode-descriptionForeground, #cccccc); margin-bottom: 2rem; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>AgentHub Chat</h1>
                    <div class="info">
                        This is the AgentHub chat webview panel.<br>
                        Use the Copilot Chat view for slash commands and @file tokens.<br>
                        (Webview UI coming soon.)
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}
