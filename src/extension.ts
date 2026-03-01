import * as vscode from "vscode";
import { createFile } from "./createFile";
import { copyRelativePath } from "./copyRelativePath";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("fileclrk.createFile", createFile),
    vscode.commands.registerCommand(
      "fileclrk.copyRelativePath",
      copyRelativePath,
    ),
  );
}

export function deactivate() {}
