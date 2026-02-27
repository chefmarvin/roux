import { describe, test, expect } from "@jest/globals";
import { analyze, parseGitLog, analyses } from "../src";

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
});
