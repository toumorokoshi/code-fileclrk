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
  isAnchor: boolean;
  detail: string;
  filterText: string;
}

/**
 * Build completion entries for markdown link paths relative to the document directory.
 * Uses case-insensitive substring matching on the filename so users can search
 * by any part of the name (e.g. typing "notes" matches "my-notes.md").
 * Returns plain data objects with no vscode dependency.
 */
export const buildCompletionEntries = (
  documentDir: string,
  partialPath: string,
): CompletionEntry[] => {
  const { searchDir, prefix } = resolveSearchDir(documentDir, partialPath);
  const entries = listDirEntries(searchDir);
  const lowerPrefix = prefix.toLowerCase();

  return entries
    .filter(
      (e) =>
        !e.name.startsWith(".") &&
        e.name.toLowerCase().includes(lowerPrefix),
    )
    .map((e) => {
      const label = e.isDirectory ? `${e.name}/` : e.name;
      const absTarget = path.join(searchDir, e.name);
      const relPath = buildMarkdownRelativePath(documentDir, absTarget);
      const insertText = e.isDirectory ? `${relPath}/` : relPath;

      return {
        label,
        insertText,
        isDirectory: e.isDirectory,
        isAnchor: false,
        detail: insertText,
        filterText: label,
      };
    });
};

/**
 * Convert a markdown heading text to a GitHub-style anchor slug.
 * Algorithm:
 *  1. Strip inline markdown formatting (bold, italic, code, links)
 *  2. Lowercase
 *  3. Remove any character that is not alphanumeric, space, or hyphen
 *  4. Replace spaces (and runs of spaces) with a single hyphen
 */
export const slugifyHeading = (text: string): string =>
  text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // strip inline links, keep text
    .replace(/[`*_~]/g, "") // strip formatting characters
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // keep word chars, spaces, hyphens
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/-+/g, "-") // collapse consecutive hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens

/**
 * Read a markdown file and return all heading anchor slugs derived from
 * ATX-style headings (`#`, `##`, … `######`).
 * Returns [] if the file cannot be read or is not a markdown file.
 */
export const extractMarkdownHeadingAnchors = (filePath: string): string[] => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content
      .split("\n")
      .map((line) => /^#{1,6}\s+(.+)$/.exec(line.trim()))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => slugifyHeading(m[1].trim()));
  } catch {
    return [];
  }
};

/**
 * Build completion entries for anchor links (`#heading-slug`) inside a given
 * target markdown file. Uses case-insensitive substring matching on the slug.
 *
 * The `insertText` is just the slug (without `#`) so that the provider can
 * replace only the fragment portion that follows the `#` the user already typed.
 */
export const buildAnchorCompletionEntries = (
  absFilePath: string,
  anchorFragment: string,
): CompletionEntry[] => {
  const anchors = extractMarkdownHeadingAnchors(absFilePath);
  const lowerFragment = anchorFragment.toLowerCase();

  return anchors
    .filter((slug) => slug.includes(lowerFragment))
    .map((slug) => ({
      label: `#${slug}`,
      insertText: slug, // provider uses a range to replace only the post-# fragment
      isDirectory: false,
      isAnchor: true,
      detail: `Heading anchor: #${slug}`,
      filterText: slug,
    }));
};
