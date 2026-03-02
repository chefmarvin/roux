import { describe, test, expect } from "@jest/globals";
import { analyze } from "../../src";

// A git2 log where file.ts was renamed: src/old.ts → src/new.ts → src/final.ts
// with edits at each stage and another untouched file
const LOG_WITH_RENAMES = [
  // Commit 1: initial work on old path
  "--aaa111--2024-01-01--Alice--initial",
  "10\t0\tsrc/old.ts",
  "5\t0\tsrc/utils.ts",
  "",
  // Commit 2: edit old path
  "--bbb222--2024-02-01--Bob--add feature",
  "3\t1\tsrc/old.ts",
  "",
  // Commit 3: rename old → new
  "--ccc333--2024-03-01--Alice--rename old to new",
  "2\t1\tsrc/{old.ts => new.ts}",
  "",
  // Commit 4: edit new path
  "--ddd444--2024-04-01--Bob--fix bug",
  "1\t1\tsrc/new.ts",
  "2\t0\tsrc/utils.ts",
  "",
  // Commit 5: rename new → final (chain rename)
  "--eee555--2024-05-01--Alice--rename new to final",
  "0\t0\tsrc/{new.ts => final.ts}",
  "",
  // Commit 6: edit final path
  "--fff666--2024-06-01--Charlie--refactor",
  "5\t2\tsrc/final.ts",
].join("\n");

// Same log content but without rename syntax (simulating --no-renames / old log files)
const LOG_WITHOUT_RENAMES = [
  "--aaa111--2024-01-01--Alice--initial",
  "10\t0\tsrc/old.ts",
  "5\t0\tsrc/utils.ts",
  "",
  "--bbb222--2024-02-01--Bob--add feature",
  "3\t1\tsrc/old.ts",
  "",
  "--ccc333--2024-03-01--Alice--rename old to new",
  "2\t1\tsrc/new.ts",
  "",
  "--ddd444--2024-04-01--Bob--fix bug",
  "1\t1\tsrc/new.ts",
  "2\t0\tsrc/utils.ts",
  "",
  "--eee555--2024-05-01--Alice--rename new to final",
  "0\t0\tsrc/final.ts",
  "",
  "--fff666--2024-06-01--Charlie--refactor",
  "5\t2\tsrc/final.ts",
].join("\n");

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}

describe("E2E: rename tracking through full pipeline", () => {
  // Use minRevs=1 so small test datasets aren't filtered out
  const opts = { minRevs: 1 };

  describe("revisions analysis", () => {
    test("consolidates all history under final filename", () => {
      const csv = analyze({ analysis: "revisions", input: LOG_WITH_RENAMES, ...opts });
      const rows = parseCSV(csv);
      const entities = rows.map((r) => r.entity);
      // src/old.ts and src/new.ts should NOT appear — all consolidated to src/final.ts
      expect(entities).not.toContain("src/old.ts");
      expect(entities).not.toContain("src/new.ts");
      expect(entities).toContain("src/final.ts");
      expect(entities).toContain("src/utils.ts");
    });

    test("revision count reflects full history of renamed file", () => {
      const csv = analyze({ analysis: "revisions", input: LOG_WITH_RENAMES, ...opts });
      const rows = parseCSV(csv);
      const finalRow = rows.find((r) => r.entity === "src/final.ts")!;
      // Commits: aaa111, bbb222, ccc333, ddd444, eee555, fff666 — all 6 touch old/new/final
      expect(parseInt(finalRow["n-revs"])).toBe(6);
    });
  });

  describe("authors analysis", () => {
    test("all authors who touched any version of the file are counted", () => {
      const csv = analyze({ analysis: "authors", input: LOG_WITH_RENAMES, ...opts });
      const rows = parseCSV(csv);
      const finalRow = rows.find((r) => r.entity === "src/final.ts")!;
      // Alice (aaa111, ccc333, eee555), Bob (bbb222, ddd444), Charlie (fff666) = 3 authors
      expect(parseInt(finalRow["n-authors"])).toBe(3);
    });
  });

  describe("entity-ownership analysis", () => {
    test("ownership reflects consolidated file history", () => {
      const csv = analyze({ analysis: "entity-ownership", input: LOG_WITH_RENAMES, ...opts });
      const rows = parseCSV(csv);
      // All rows for the renamed file should reference src/final.ts
      const finalRows = rows.filter((r) => r.entity === "src/final.ts");
      expect(finalRows.length).toBeGreaterThan(0);
      const oldRows = rows.filter((r) => r.entity === "src/old.ts" || r.entity === "src/new.ts");
      expect(oldRows).toHaveLength(0);
    });
  });

  describe("followRenames=false disables tracking", () => {
    test("renamed file appears under separate paths", () => {
      const csv = analyze({
        analysis: "revisions",
        input: LOG_WITH_RENAMES,
        followRenames: false,
        ...opts,
      });
      const rows = parseCSV(csv);
      const entities = rows.map((r) => r.entity);
      // Without tracking, parser still resolves brace syntax to newPath,
      // but old commits with literal old paths stay separate.
      // old.ts appears in commits aaa111+bbb222, new.ts in ccc333+ddd444, final.ts in eee555+fff666
      expect(entities).toContain("src/old.ts");
      expect(entities).toContain("src/final.ts");
    });
  });

  describe("backward compatibility with old log format", () => {
    test("log without rename syntax works normally (transform is no-op)", () => {
      const csv = analyze({ analysis: "revisions", input: LOG_WITHOUT_RENAMES, ...opts });
      const rows = parseCSV(csv);
      const entities = rows.map((r) => r.entity);
      // No rename info → each path is its own entity
      expect(entities).toContain("src/old.ts");
      expect(entities).toContain("src/new.ts");
      expect(entities).toContain("src/final.ts");
      expect(entities).toContain("src/utils.ts");
    });
  });

  describe("old git format parser", () => {
    const LOG_GIT_FORMAT = [
      "[aaa1111] Alice 2024-01-01 initial",
      "10\t0\tsrc/old.ts",
      "",
      "[bbb2222] Bob 2024-03-01 rename",
      "2\t1\tsrc/{old.ts => final.ts}",
      "",
      "[ccc3333] Charlie 2024-05-01 edit",
      "5\t2\tsrc/final.ts",
    ].join("\n");

    test("rename tracking works with old git format", () => {
      const csv = analyze({
        analysis: "revisions",
        input: LOG_GIT_FORMAT,
        logFormat: "git",
        ...opts,
      });
      const rows = parseCSV(csv);
      const entities = rows.map((r) => r.entity);
      expect(entities).not.toContain("src/old.ts");
      expect(entities).toContain("src/final.ts");
      const finalRow = rows.find((r) => r.entity === "src/final.ts")!;
      expect(parseInt(finalRow["n-revs"])).toBe(3);
    });
  });

  describe("JSON output format", () => {
    test("rename tracking works with JSON output", () => {
      const json = analyze({
        analysis: "revisions",
        input: LOG_WITH_RENAMES,
        outputFormat: "json",
        ...opts,
      });
      const rows = JSON.parse(json);
      const entities = rows.map((r: Record<string, unknown>) => r.entity);
      expect(entities).not.toContain("src/old.ts");
      expect(entities).not.toContain("src/new.ts");
      expect(entities).toContain("src/final.ts");
    });
  });
});
