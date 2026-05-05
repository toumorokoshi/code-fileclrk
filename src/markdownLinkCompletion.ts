import * as vscode from "vscode";
import * as path from "path";
import {
  MARKDOWN_LINK_TRIGGER_RE,
  buildCompletionEntries,
  buildAnchorCompletionEntries,
} from "./markdownLinkCompletionUtils";

/**
 * VSCode CompletionItemProvider that autocompletes markdown-style links
 * with relative paths to files/folders in the workspace, and heading anchors
 * once a file path has been typed.
 *
 * Triggered when the cursor is inside `[text](` pattern in markdown files.
 *
 * Two modes:
 *  - File mode  : `[text](partial-path`  → substring-match files/folders
 *  - Anchor mode: `[text](file.md#frag` → substring-match heading slugs
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

    // --- Anchor mode: user has typed a `#` after the file path ---
    const hashIdx = partialPath.indexOf("#");
    if (hashIdx >= 0) {
      const filePath = partialPath.slice(0, hashIdx);
      const anchorFragment = partialPath.slice(hashIdx + 1);
      const absFilePath = path.resolve(documentDir, filePath);

      const entries = buildAnchorCompletionEntries(absFilePath, anchorFragment);

      // Replace only the anchor fragment (the text after `#`) using an explicit range
      const anchorFragStart = position.character - anchorFragment.length;
      const replaceRange = new vscode.Range(
        new vscode.Position(position.line, anchorFragStart),
        position,
      );

      return entries.map((entry) => {
        const item = new vscode.CompletionItem(
          entry.label,
          vscode.CompletionItemKind.Reference,
        );
        item.insertText = entry.insertText; // slug only, without `#`
        item.filterText = entry.filterText;
        item.detail = entry.detail;
        item.range = replaceRange;
        return item;
      });
    }

    // --- File mode: enumerate files and folders with substring matching ---
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
