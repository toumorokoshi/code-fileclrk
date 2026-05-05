import * as vscode from "vscode";
import * as path from "path";
import {
  MARKDOWN_LINK_TRIGGER_RE,
  buildCompletionEntries,
} from "./markdownLinkCompletionUtils";

/**
 * VSCode CompletionItemProvider that autocompletes markdown-style links
 * with relative paths to files/folders in the workspace.
 *
 * Triggered when the cursor is inside `[text](` pattern in markdown files.
 */
export class MarkdownLinkCompletionProvider
  implements vscode.CompletionItemProvider
{
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    const lineTextUpToCursor = document
      .lineAt(position)
      .text.slice(0, position.character);

    const match = MARKDOWN_LINK_TRIGGER_RE.exec(lineTextUpToCursor);
    if (!match) {
      return [];
    }

    const partialPath = match[2]; // everything after `](`
    const documentDir = path.dirname(document.uri.fsPath);
    const entries = buildCompletionEntries(documentDir, partialPath);

    return entries.map((entry) => {
      const item = new vscode.CompletionItem(
        entry.label,
        entry.isDirectory
          ? vscode.CompletionItemKind.Folder
          : vscode.CompletionItemKind.File,
      );
      item.insertText = entry.insertText;
      item.filterText = entry.filterText;
      item.detail = entry.detail;

      // For directories, re-trigger completions so the user can navigate deeper
      if (entry.isDirectory) {
        item.command = {
          command: "editor.action.triggerSuggest",
          title: "Re-trigger completions",
        };
      }

      return item;
    });
  }
}
