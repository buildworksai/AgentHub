import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface FileFolderQuickPickItem extends vscode.QuickPickItem {
    fsPath: string;
    isFolder: boolean;
}

/**
 * Recursively gather all files and folders in the workspace, up to a depth limit.
 */
function gatherFilesAndFolders(dir: string, depth: number, maxDepth: number, ignore: RegExp[]): FileFolderQuickPickItem[] {
    if (depth > maxDepth) { return []; }
    const items: FileFolderQuickPickItem[] = [];
    const entries: string[] = (() => {
        try {
            return fs.readdirSync(dir);
        } catch {
            return [];
        }
    })();
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        if (ignore.some(r => r.test(fullPath))) { continue; }
        const stat: fs.Stats | undefined = (() => {
            try {
                return fs.statSync(fullPath);
            } catch {
                return undefined;
            }
        })();
        if (!stat) { continue; }
        if (stat.isDirectory()) {
            items.push({
                label: `$(folder) ${entry}`,
                description: path.relative(vscode.workspace.rootPath || '', fullPath),
                fsPath: fullPath,
                isFolder: true
            });
            items.push(...gatherFilesAndFolders(fullPath, depth + 1, maxDepth, ignore));
        } else {
            items.push({
                label: `$(file) ${entry}`,
                description: path.relative(vscode.workspace.rootPath || '', fullPath),
                fsPath: fullPath,
                isFolder: false
            });
        }
    }
    return items;
}

/**
 * Show QuickPick for files and folders in the workspace.
 * @param maxDepth Maximum folder depth to search (default 6)
 * @returns The selected file/folder path, or undefined
 */
export async function showFileFolderQuickPick(maxDepth = 6): Promise<FileFolderQuickPickItem | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }
    const root = workspaceFolders[0].uri.fsPath;
    const ignore = [/node_modules/, /\.git/, /dist/, /build/, /out/];
    const items = gatherFilesAndFolders(root, 0, maxDepth, ignore);
    if (items.length === 0) {
        vscode.window.showWarningMessage('No files or folders found in workspace');
        return;
    }
    return vscode.window.showQuickPick(items, {
        placeHolder: 'Select a file or folder',
        matchOnDescription: true,
        matchOnDetail: true
    });
}
