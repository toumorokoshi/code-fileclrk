import * as vscode from "vscode";
import { createFile } from "./createFile";
import { createFolder } from "./createFolder";
import { copyRelativePath } from "./copyRelativePath";
import { deleteFile } from "./deleteFile";
import { renameFile } from "./renameFile";
import { MarkdownLinkCompletionProvider } from "./markdownLinkCompletion";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("fileclrk.createFile", createFile),
    vscode.commands.registerCommand("fileclrk.createFolder", createFolder),
    vscode.commands.registerCommand(
      "fileclrk.copyRelativePath",
      copyRelativePath,
    ),
    vscode.commands.registerCommand("fileclrk.deleteFile", deleteFile),
    vscode.commands.registerCommand("fileclrk.renameFile", renameFile),
    vscode.languages.registerCompletionItemProvider(
      { language: "markdown" },
      new MarkdownLinkCompletionProvider(),
      "(",
      "/",
    ),
  );
}

export function deactivate() {}
