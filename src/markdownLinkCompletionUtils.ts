import * as path from "path";
import * as fs from "fs";

// Regex to detect if the cursor is inside a markdown link's URL portion: [text](
export const MARKDOWN_LINK_TRIGGER_RE = /\[([^\]]*)\]\(([^)]*)$/;

/**
 * Build a relative path from the current document's directory to the target file,
 * using forward slashes (per URI convention in markdown links).
 */
export const buildMarkdownRelativePath = (
  documentDir: string,
  targetAbsPath: string,
): string => {
  const rel = path.relative(documentDir, targetAbsPath);
  // Normalize to forward slashes for cross-platform markdown compatibility
  return rel.split(path.sep).join("/");
};

/**
 * Given a directory and the partial path the user has typed so far,
 * resolve the directory to enumerate files/folders in.
 */
export const resolveSearchDir = (
  documentDir: string,
  partialPath: string,
): { searchDir: string; prefix: string } => {
  // The part before the last slash is the directory fragment; the part after is the file fragment
  const lastSlash = partialPath.lastIndexOf("/");
  const dirFragment =
    lastSlash >= 0 ? partialPath.slice(0, lastSlash) : "";
  const prefix =
    lastSlash >= 0 ? partialPath.slice(lastSlash + 1) : partialPath;
  const searchDir = dirFragment
    ? path.resolve(documentDir, dirFragment)
    : documentDir;
  return { searchDir, prefix };
};

/**
 * List entries in a directory, returning { name, isDirectory } pairs.
 * Returns [] if the directory doesn't exist or can't be read.
 */
export const listDirEntries = (
  dir: string,
): { name: string; isDirectory: boolean }[] => {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
    }));
  } catch {
    return [];
  }
};

export interface CompletionEntry {
  label: string;
  insertText: string;
  isDirectory: boolean;
  detail: string;
  filterText: string;
}

/**
 * Build completion entries for markdown link paths relative to the document directory.
 * Returns plain data objects with no vscode dependency.
 */
export const buildCompletionEntries = (
  documentDir: string,
  partialPath: string,
): CompletionEntry[] => {
  const { searchDir, prefix } = resolveSearchDir(documentDir, partialPath);
  const entries = listDirEntries(searchDir);

  return entries
    .filter((e) => !e.name.startsWith(".") && e.name.startsWith(prefix))
    .map((e) => {
      const label = e.isDirectory ? `${e.name}/` : e.name;
      const absTarget = path.join(searchDir, e.name);
      const relPath = buildMarkdownRelativePath(documentDir, absTarget);
      const insertText = e.isDirectory ? `${relPath}/` : relPath;

      return {
        label,
        insertText,
        isDirectory: e.isDirectory,
        detail: insertText,
        filterText: label,
      };
    });
};
