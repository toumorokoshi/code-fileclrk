import * as vscode from "vscode";
import * as path from "path";

const getDefaultDirectory = (
  editor: vscode.TextEditor | undefined,
  workspaceRoot: string,
): string => {
  if (!editor) {
    return "";
  }
  return path.relative(workspaceRoot, path.dirname(editor.document.uri.fsPath));
};

export const createFolder = async (): Promise<void> => {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("FileClrk: No workspace folder open.");
    return;
  }

  const workspaceRoot = workspaceFolder.uri.fsPath;
  const defaultDir = getDefaultDirectory(
    vscode.window.activeTextEditor,
    workspaceRoot,
  );

  const directory = await vscode.window.showInputBox({
    prompt: "Parent directory (relative to workspace root)",
    value: defaultDir,
  });
  if (directory === undefined) {
    return;
  }

  const folderName = await vscode.window.showInputBox({
    prompt: "Folder name",
  });
  if (!folderName) {
    return;
  }

  const folderUri = vscode.Uri.file(
    path.join(workspaceRoot, directory, folderName),
  );
  await vscode.workspace.fs.createDirectory(folderUri);
  vscode.window.showInformationMessage(`Created folder: ${folderName}`);
};
