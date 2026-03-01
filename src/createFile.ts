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

export const createFile = async (): Promise<void> => {
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
    prompt: "Directory (relative to workspace root)",
    value: defaultDir,
  });
  if (directory === undefined) {
    return;
  }

  const filename = await vscode.window.showInputBox({
    prompt: "Filename",
  });
  if (!filename) {
    return;
  }

  const fileUri = vscode.Uri.file(
    path.join(workspaceRoot, directory, filename),
  );
  await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());
  const doc = await vscode.workspace.openTextDocument(fileUri);
  await vscode.window.showTextDocument(doc);
};
