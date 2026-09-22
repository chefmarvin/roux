import { describe, test, expect } from "@jest/globals";
import { run } from "../src/app";

describe("empty input", () => {
  // An empty log is a legitimate answer: a date range with no commits in it.
  // Treating it as "no input given" makes roux fall back to generating a log
  // from the current working directory, reporting on whatever repository the
  // process happens to be sitting in — silently, and with plausible numbers.
  test("reports an empty history rather than falling back to the cwd", () => {
    const summary = JSON.parse(
      run({ analysis: "summary", input: "", outputFormat: "json" }),
    ) as Array<{ statistic: string; value: number }>;

    for (const stat of summary) {
      expect(stat.value).toBe(0);
    }
  });

  test("returns no rows for an entity analysis", () => {
    expect(JSON.parse(run({ analysis: "revisions", input: "", outputFormat: "json" }))).toEqual([]);
  });
});
