import * as vscode from "vscode";
import * as path from "path";
import {
  buildMarkdownRelativePath,
  extractMarkdownHeadingAnchors,
} from "./markdownLinkCompletionUtils";

export async function insertMarkdownLink() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active text editor.");
    return;
  }

  const documentDir = path.dirname(editor.document.uri.fsPath);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(
    editor.document.uri,
  );
  const rootPath = workspaceFolder ? workspaceFolder.uri.fsPath : documentDir;

  // Using `null` for exclude will apply default `search.exclude` and `files.exclude`
  // settings, which respects `.gitignore` by default in VSCode.
  const files = await vscode.workspace.findFiles("**/*", null);
  if (files.length === 0) {
    vscode.window.showInformationMessage("No files found in the workspace.");
    return;
  }

  const fileItems = files.map((uri) => {
    const relativeToRoot = path.relative(rootPath, uri.fsPath);
    return {
      label: relativeToRoot,
      description: path.basename(uri.fsPath),
      uri: uri,
    };
  });

  const selectedFileItem = await vscode.window.showQuickPick(fileItems, {
    placeHolder: "Select a file to link to...",
    matchOnDescription: true,
  });

  if (!selectedFileItem) {
    return;
  }

  const targetUri = selectedFileItem.uri;
  const relativePath = buildMarkdownRelativePath(documentDir, targetUri.fsPath);
  let anchor = "";

  if (targetUri.fsPath.toLowerCase().endsWith(".md")) {
    const anchors = extractMarkdownHeadingAnchors(targetUri.fsPath);
    if (anchors.length > 0) {
      const anchorItems = [
        {
          label: "(No anchor)",
          description: "Do not link to a specific heading",
          anchor: "",
        },
        ...anchors.map((a) => ({
          label: `#${a}`,
          description: `Heading: ${a}`,
          anchor: `#${a}`,
        })),
      ];

      const selectedAnchorItem = await vscode.window.showQuickPick(
        anchorItems,
        {
          placeHolder: "Select a heading anchor (optional)",
        },
      );

      if (!selectedAnchorItem) {
        return;
      }

      anchor = selectedAnchorItem.anchor;
    }
  }

  const selection = editor.selection;
  let linkText = editor.document.getText(selection);
  if (!linkText) {
    linkText = path.basename(targetUri.fsPath);
  }

  const linkString = `[${linkText}](${relativePath}${anchor})`;

  await editor.edit((editBuilder) => {
    if (selection.isEmpty) {
      editBuilder.insert(selection.active, linkString);
    } else {
      editBuilder.replace(selection, linkString);
    }
  });
}
