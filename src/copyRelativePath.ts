import * as vscode from "vscode";
import * as path from "path";

export const buildRelativePath = (
  filePath: string,
  workspaceRoot: string,
  cursorLine: number,
  selectionStartLine?: number,
  selectionEndLine?: number,
): string => {
  const relativePath = path.relative(workspaceRoot, filePath);
  if (
    selectionStartLine !== undefined &&
    selectionEndLine !== undefined &&
    selectionStartLine !== selectionEndLine
  ) {
    return `${relativePath}#L${selectionStartLine}-L${selectionEndLine}`;
  }
  return `${relativePath}#L${cursorLine}`;
};

export const copyRelativePath = async (): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("FileClrk: No active editor.");
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("FileClrk: No workspace folder open.");
    return;
  }

  const selection = editor.selection;
  const cursorLine = selection.active.line + 1;
  const selectionStartLine = selection.start.line + 1;
  const selectionEndLine = selection.end.line + 1;

  const result = buildRelativePath(
    editor.document.uri.fsPath,
    workspaceFolder.uri.fsPath,
    cursorLine,
    selection.isEmpty ? undefined : selectionStartLine,
    selection.isEmpty ? undefined : selectionEndLine,
  );

  await vscode.env.clipboard.writeText(result);
  vscode.window.showInformationMessage(`Copied: ${result}`);
};
