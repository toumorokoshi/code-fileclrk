# Spec: Markdown Link Path Autocomplete

## Overview

When a user types a markdown-style link in a `.md` file, the extension
provides path autocompletion for the URL portion of the link, including both
relative file paths and heading anchors within the target file.

## Trigger

The completion activates when the cursor is positioned inside the URL part of
a markdown link — i.e., the line up to the cursor matches:

```
[any text](partial-path
```

Trigger characters are `(`, `/`, and `#`:
- `(` — activates on initial link open
- `/` — re-activates when navigating into subdirectories
- `#` — activates anchor completion after a file path

## Behavior

### File path mode

Active when the URL portion contains no `#` character.

1. **Root directory**: Completions enumerate files and directories relative to
   the directory of the currently open document (not the workspace root).
2. **Hidden entries excluded**: Any file or folder whose name starts with `.`
   is not offered as a completion.
3. **Substring matching**: The filename fragment after the last `/` is matched
   as a case-insensitive substring against entry names. This means typing
   `notes` will match `meeting-notes.md`, not just files starting with `notes`.
4. **Directory traversal**: As the user types a path including `/`, completions
   enumerate the contents of the resolved subdirectory.
5. **Insert text**: The full relative path from the document directory to the
   selected entry is inserted, replacing any partial path already typed.
6. **Directory entries**: A trailing `/` is appended to directory labels and
   insert text, and `editor.action.triggerSuggest` is re-fired so the user can
   continue navigating.

### Anchor mode

Active when the URL portion contains a `#` character (e.g. `file.md#`).

1. **Trigger**: Typing `#` after a file path switches to anchor mode.
2. **Source**: Headings are extracted from the target file (resolved relative
   to the document directory) using ATX-style heading syntax (`# … ######`).
3. **Slug generation**: GitHub-style slugs are computed from heading text:
   - Strip inline markdown formatting (bold, italic, code, links)
   - Lowercase
   - Remove characters that are not alphanumeric, spaces, or hyphens
   - Replace spaces with hyphens, collapse consecutive hyphens
4. **Substring matching**: The fragment after `#` is matched as a
   case-insensitive substring against the generated slugs.
5. **Range replacement**: Only the anchor fragment (text after `#`) is replaced
   when a completion is accepted — the file path before `#` is preserved.

## Architecture

The feature is split into two modules:

- **`markdownLinkCompletionUtils.ts`** — pure functional helpers with no
  `vscode` dependency, fully unit-tested with mocha.
  - `buildMarkdownRelativePath(documentDir, targetAbsPath): string`
  - `resolveSearchDir(documentDir, partialPath): { searchDir, prefix }`
  - `listDirEntries(dir): { name, isDirectory }[]`
  - `buildCompletionEntries(documentDir, partialPath): CompletionEntry[]`
  - `slugifyHeading(text): string`
  - `extractMarkdownHeadingAnchors(filePath): string[]`
  - `buildAnchorCompletionEntries(absFilePath, anchorFragment): CompletionEntry[]`

- **`markdownLinkCompletion.ts`** — thin VSCode `CompletionItemProvider` that
  wraps the utils, detects file vs. anchor mode, and maps `CompletionEntry`
  objects to `CompletionItem` with appropriate ranges.

## Registration

Registered for the `markdown` language with trigger characters `(`, `/`, and
`#` via `vscode.languages.registerCompletionItemProvider`.
