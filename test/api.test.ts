import { describe, test, expect } from "@jest/globals";
import { analyze, parseGitLog, analyses } from "../src";
import type { GitLogOptions } from "../src";

describe("programmatic API", () => {
  test("analyze returns CSV string", () => {
    const log = `--abc123--2023-01-01--Alice
1\t0\tfile.ts
`;
    const result = analyze({ analysis: "summary", input: log });
    expect(typeof result).toBe("string");
    expect(result).toContain("statistic");
  });

  test("parseGitLog is exported", () => {
    const mods = parseGitLog(`--abc--2023-01-01--Bob
5\t2\tapp.ts
`);
    expect(mods[0].author).toBe("Bob");
  });

  test("analyses registry is exported", () => {
    expect(Object.keys(analyses)).toContain("summary");
    expect(Object.keys(analyses)).toContain("authors");
    expect(Object.keys(analyses)).toContain("coupling");
    expect(Object.keys(analyses)).toContain("abs-churn");
  });

  test("GitLogOptions type is exported", () => {
    const opts: GitLogOptions = { repo: ".", after: "2024-01-01" };
    expect(opts.after).toBe("2024-01-01");
  });

  describe("analyze with git log filters", () => {
    const REPO = process.env.CODE_MAAT_REPO ?? `${process.env.HOME}/Documents/github/code-maat`;

    test("analyze passes --after filter", () => {
      const result = analyze({
        analysis: "abs-churn",
        repo: REPO,
        after: "2024-01-01",
      });
      // abs-churn CSV: date,added,deleted,commits
      const lines = result.trim().split("\n");
      expect(lines.length).toBeGreaterThan(1); // header + at least one row
      for (const line of lines.slice(1)) {
        const date = line.split(",")[0];
        expect(date >= "2024-01-01").toBe(true);
      }
    });

    test("analyze passes --before filter", () => {
      const result = analyze({
        analysis: "abs-churn",
        repo: REPO,
        before: "2014-06-01",
      });
      // abs-churn CSV: date,added,deleted,commits
      const lines = result.trim().split("\n");
      expect(lines.length).toBeGreaterThan(1); // header + at least one row
      for (const line of lines.slice(1)) {
        const date = line.split(",")[0];
        expect(date < "2014-06-01").toBe(true);
      }
    });

    test("analyze passes --rev filter", () => {
      const result = analyze({
        analysis: "summary",
        repo: REPO,
        rev: "v1.0..v1.0.1",
      });
      expect(result).toContain("statistic");
    });
  });
});
