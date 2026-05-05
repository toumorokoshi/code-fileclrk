# Spec: Markdown Link Path Autocomplete

## Overview

When a user types a markdown-style link in a `.md` file, the extension
provides path autocompletion for the URL portion of the link.

## Trigger

The completion activates when the cursor is positioned inside the URL part of
a markdown link — i.e., the line up to the cursor matches:

```
[any text](partial-path
```

Trigger characters are `(` and `/` to enable both initial activation and
sub-directory navigation.

## Behavior

1. **Root directory**: Completions enumerate files and directories relative to
   the directory of the currently open document (not the workspace root).
2. **Hidden entries excluded**: Any file or folder whose name starts with `.`
   is not offered as a completion.
3. **Prefix filtering**: Only entries whose name starts with the typed prefix
   (the fragment after the last `/`) are shown.
4. **Directory traversal**: As the user types a path including `/`, completions
   enumerate the contents of the resolved subdirectory.
5. **Insert text**: The full relative path from the document directory to the
   selected entry is inserted, replacing any partial path already typed.
6. **Directory entries**: A trailing `/` is appended to directory labels and
   insert text, and `editor.action.triggerSuggest` is re-fired so the user can
   continue navigating.

## Architecture

The feature is split into two modules:

- **`markdownLinkCompletionUtils.ts`** — pure functional helpers with no
  `vscode` dependency, fully unit-tested with mocha.
  - `buildMarkdownRelativePath(documentDir, targetAbsPath): string`
  - `resolveSearchDir(documentDir, partialPath): { searchDir, prefix }`
  - `listDirEntries(dir): { name, isDirectory }[]`
  - `buildCompletionEntries(documentDir, partialPath): CompletionEntry[]`

- **`markdownLinkCompletion.ts`** — thin VSCode `CompletionItemProvider` that
  wraps the utils and maps `CompletionEntry` objects to `CompletionItem`.

## Registration

Registered for the `markdown` language with trigger characters `(` and `/` via
`vscode.languages.registerCompletionItemProvider`.
