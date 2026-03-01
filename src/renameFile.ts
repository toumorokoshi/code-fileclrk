import * as vscode from "vscode";
import * as path from "path";

export const renameFile = async (): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("FileClrk: No active editor.");
    return;
  }

  const fileUri = editor.document.uri;
  const currentName = path.basename(fileUri.fsPath);

  const newName = await vscode.window.showInputBox({
    prompt: "New filename",
    value: currentName,
  });
  if (!newName || newName === currentName) {
    return;
  }

  const newUri = vscode.Uri.file(
    path.join(path.dirname(fileUri.fsPath), newName),
  );
  await vscode.workspace.fs.rename(fileUri, newUri);
  const doc = await vscode.workspace.openTextDocument(newUri);
  await vscode.window.showTextDocument(doc);
};
