import * as assert from "assert";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import {
  buildMarkdownRelativePath,
  resolveSearchDir,
  buildCompletionEntries,
  slugifyHeading,
  extractMarkdownHeadingAnchors,
  buildAnchorCompletionEntries,
} from "../markdownLinkCompletionUtils";

// Helper: create a temp directory tree for tests
function makeTempTree(structure: Record<string, string | null>): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fileclrk-test-"));
  for (const [relPath, content] of Object.entries(structure)) {
    const abs = path.join(tmpDir, relPath);
    if (content === null) {
      // It's a directory
      fs.mkdirSync(abs, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
    }
  }
  return tmpDir;
}

suite("markdownLinkCompletion", () => {
  suite("buildMarkdownRelativePath", () => {
    test("returns relative path with forward slashes", () => {
      const docDir = "/home/user/docs";
      const target = "/home/user/docs/sub/file.md";
      const result = buildMarkdownRelativePath(docDir, target);
      assert.strictEqual(result, "sub/file.md");
    });

    test("navigates up directories", () => {
      const docDir = "/home/user/docs/sub";
      const target = "/home/user/docs/other.md";
      const result = buildMarkdownRelativePath(docDir, target);
      assert.strictEqual(result, "../other.md");
    });

    test("same directory returns filename only", () => {
      const docDir = "/home/user/docs";
      const target = "/home/user/docs/notes.md";
      const result = buildMarkdownRelativePath(docDir, target);
      assert.strictEqual(result, "notes.md");
    });
  });

  suite("resolveSearchDir", () => {
    test("empty partial path returns docDir and empty prefix", () => {
      const { searchDir, prefix } = resolveSearchDir("/docs", "");
      assert.strictEqual(searchDir, "/docs");
      assert.strictEqual(prefix, "");
    });

    test("partial path without slash returns docDir and typed name as prefix", () => {
      const { searchDir, prefix } = resolveSearchDir("/docs", "no");
      assert.strictEqual(searchDir, "/docs");
      assert.strictEqual(prefix, "no");
    });

    test("partial path with slash splits dir and prefix", () => {
      const { searchDir, prefix } = resolveSearchDir("/docs", "sub/");
      assert.strictEqual(searchDir, path.resolve("/docs", "sub"));
      assert.strictEqual(prefix, "");
    });

    test("partial path with sub dir and prefix", () => {
      const { searchDir, prefix } = resolveSearchDir("/docs", "sub/not");
      assert.strictEqual(searchDir, path.resolve("/docs", "sub"));
      assert.strictEqual(prefix, "not");
    });
  });

  suite("buildCompletionEntries", () => {
    let tmpDir: string;

    setup(() => {
      tmpDir = makeTempTree({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "README.md": "# readme",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "meeting-notes.md": "notes",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "images/photo.png": "data",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ".hidden": "hidden",
      });
    });

    teardown(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test("returns files and folders, excluding hidden entries", () => {
      const items = buildCompletionEntries(tmpDir, "");
      const labels = items.map((i) => i.label);
      assert.ok(labels.includes("README.md"), "should include README.md");
      assert.ok(
        labels.includes("meeting-notes.md"),
        "should include meeting-notes.md",
      );
      assert.ok(labels.includes("images/"), "should include images/ directory");
      assert.ok(!labels.includes(".hidden"), "should exclude hidden files");
    });

    test("prefix match (startsWith still works as substring)", () => {
      const items = buildCompletionEntries(tmpDir, "RE");
      const labels = items.map((i) => i.label);
      assert.deepStrictEqual(labels, ["README.md"]);
    });

    test("substring match finds mid-name fragment", () => {
      const items = buildCompletionEntries(tmpDir, "notes");
      const labels = items.map((i) => i.label);
      assert.ok(
        labels.includes("meeting-notes.md"),
        "substring 'notes' should match meeting-notes.md",
      );
    });

    test("substring match is case-insensitive", () => {
      const items = buildCompletionEntries(tmpDir, "readme");
      const labels = items.map((i) => i.label);
      assert.ok(
        labels.includes("README.md"),
        "case-insensitive match should find README.md",
      );
    });

    test("navigates into subdirectory", () => {
      const items = buildCompletionEntries(tmpDir, "images/");
      const labels = items.map((i) => i.label);
      assert.ok(labels.includes("photo.png"), "should list files in images/");
    });

    test("insertText is a relative path from documentDir", () => {
      const items = buildCompletionEntries(tmpDir, "");
      const readme = items.find((i) => i.label === "README.md");
      assert.ok(readme, "README.md item should exist");
      assert.strictEqual(readme.insertText, "README.md");
    });

    test("insertText for subdirectory file is relative from docDir", () => {
      const items = buildCompletionEntries(tmpDir, "images/");
      const photo = items.find((i) => i.label === "photo.png");
      assert.ok(photo, "photo.png item should exist");
      assert.strictEqual(photo.insertText, "images/photo.png");
    });

    test("returns empty array for non-existent partial path dir", () => {
      const items = buildCompletionEntries(tmpDir, "nonexistent/");
      assert.deepStrictEqual(items, []);
    });
  });

  suite("slugifyHeading", () => {
    test("lowercases and replaces spaces with hyphens", () => {
      assert.strictEqual(slugifyHeading("Hello World"), "hello-world");
    });

    test("strips inline code backticks", () => {
      assert.strictEqual(slugifyHeading("Use `fs.readFile`"), "use-fsreadfile");
    });

    test("strips bold and italic markers", () => {
      assert.strictEqual(slugifyHeading("**Bold** and _italic_"), "bold-and-italic");
    });

    test("strips inline links, keeps link text", () => {
      assert.strictEqual(
        slugifyHeading("[GitHub](https://github.com) Overview"),
        "github-overview",
      );
    });

    test("collapses multiple hyphens", () => {
      assert.strictEqual(slugifyHeading("foo  bar"), "foo-bar");
    });

    test("removes leading and trailing hyphens", () => {
      assert.strictEqual(slugifyHeading("  hello  "), "hello");
    });
  });

  suite("extractMarkdownHeadingAnchors", () => {
    let tmpDir: string;

    setup(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fileclrk-anchor-"));
    });

    teardown(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test("extracts ATX headings of all levels", () => {
      const file = path.join(tmpDir, "doc.md");
      fs.writeFileSync(
        file,
        [
          "# Introduction",
          "## Getting Started",
          "### Installation Guide",
          "#### Sub Topic",
          "not a heading",
          "## API Reference",
        ].join("\n"),
      );
      const anchors = extractMarkdownHeadingAnchors(file);
      assert.deepStrictEqual(anchors, [
        "introduction",
        "getting-started",
        "installation-guide",
        "sub-topic",
        "api-reference",
      ]);
    });

    test("returns empty array for non-existent file", () => {
      const anchors = extractMarkdownHeadingAnchors("/nonexistent/path.md");
      assert.deepStrictEqual(anchors, []);
    });

    test("returns empty array for file with no headings", () => {
      const file = path.join(tmpDir, "plain.md");
      fs.writeFileSync(file, "Just some text\nNo headings here");
      const anchors = extractMarkdownHeadingAnchors(file);
      assert.deepStrictEqual(anchors, []);
    });
  });

  suite("buildAnchorCompletionEntries", () => {
    let tmpDir: string;
    let mdFile: string;

    setup(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fileclrk-anchor-"));
      mdFile = path.join(tmpDir, "guide.md");
      fs.writeFileSync(
        mdFile,
        [
          "# Introduction",
          "## Getting Started",
          "## API Reference",
          "### Advanced Usage",
        ].join("\n"),
      );
    });

    teardown(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test("returns all anchors when fragment is empty", () => {
      const entries = buildAnchorCompletionEntries(mdFile, "");
      const labels = entries.map((e) => e.label);
      assert.deepStrictEqual(labels, [
        "#introduction",
        "#getting-started",
        "#api-reference",
        "#advanced-usage",
      ]);
    });

    test("filters anchors by substring match", () => {
      const entries = buildAnchorCompletionEntries(mdFile, "start");
      const labels = entries.map((e) => e.label);
      assert.deepStrictEqual(labels, ["#getting-started"]);
    });

    test("filter is case-insensitive", () => {
      const entries = buildAnchorCompletionEntries(mdFile, "API");
      const labels = entries.map((e) => e.label);
      assert.ok(
        labels.includes("#api-reference"),
        "case-insensitive match should find #api-reference",
      );
    });

    test("insertText is slug without hash", () => {
      const entries = buildAnchorCompletionEntries(mdFile, "intro");
      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0].insertText, "introduction");
    });

    test("isAnchor is true for all entries", () => {
      const entries = buildAnchorCompletionEntries(mdFile, "");
      assert.ok(entries.every((e) => e.isAnchor));
    });

    test("returns empty array for non-existent file", () => {
      const entries = buildAnchorCompletionEntries(
        "/no/such/file.md",
        "",
      );
      assert.deepStrictEqual(entries, []);
    });
  });
});
