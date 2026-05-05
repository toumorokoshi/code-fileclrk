import * as assert from "assert";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import {
  buildMarkdownRelativePath,
  resolveSearchDir,
  buildCompletionEntries,
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
        "notes.md": "notes",
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
      assert.ok(labels.includes("notes.md"), "should include notes.md");
      assert.ok(labels.includes("images/"), "should include images/ directory");
      assert.ok(!labels.includes(".hidden"), "should exclude hidden files");
    });

    test("filters by prefix", () => {
      const items = buildCompletionEntries(tmpDir, "RE");
      const labels = items.map((i) => i.label);
      assert.deepStrictEqual(labels, ["README.md"]);
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
});
