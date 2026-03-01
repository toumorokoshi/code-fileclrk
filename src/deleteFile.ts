import * as vscode from "vscode";
import * as path from "path";

export const deleteFile = async (): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("FileClrk: No active editor.");
    return;
  }

  const fileUri = editor.document.uri;
  const filename = path.basename(fileUri.fsPath);

  const confirmed = await vscode.window.showWarningMessage(
    `Are you sure you want to delete "${filename}"?`,
    { modal: true },
    "Delete",
  );
  if (confirmed !== "Delete") {
    return;
  }

  await vscode.workspace.fs.delete(fileUri);
  vscode.window.showInformationMessage(`Deleted: ${filename}`);
};
