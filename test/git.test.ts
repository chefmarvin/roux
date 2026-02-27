import { describe, test, expect } from "@jest/globals";
import { generateGitLog } from "../src/git";

const REPO = process.env.CODE_MAAT_REPO ?? `${process.env.HOME}/Documents/github/code-maat`;

// Matches commit header lines: --hash--YYYY-MM-DD--author--subject
const DATE_RE = /--\w+--(\d{4}-\d{2}-\d{2})--/g;

function extractDates(log: string): string[] {
  return [...log.matchAll(DATE_RE)].map(m => m[1]);
}

describe("generateGitLog", () => {
  test("generates log from repo (no filters)", () => {
    const log = generateGitLog({ repo: REPO });
    expect(log.length).toBeGreaterThan(0);
    expect(extractDates(log).length).toBeGreaterThan(0);
  });

  test("filters with --after", () => {
    const log = generateGitLog({ repo: REPO, after: "2024-01-01" });
    const dates = extractDates(log);
    expect(dates.length).toBeGreaterThan(0);
    for (const d of dates) {
      expect(d >= "2024-01-01").toBe(true);
    }
  });

  test("filters with --before", () => {
    const log = generateGitLog({ repo: REPO, before: "2014-01-01" });
    const dates = extractDates(log);
    expect(dates.length).toBeGreaterThan(0);
    for (const d of dates) {
      expect(d < "2014-01-01").toBe(true);
    }
  });

  test("filters with --after + --before", () => {
    const log = generateGitLog({ repo: REPO, after: "2015-01-01", before: "2016-01-01" });
    const dates = extractDates(log);
    expect(dates.length).toBeGreaterThan(0);
    for (const d of dates) {
      expect(d >= "2015-01-01").toBe(true);
      expect(d < "2016-01-01").toBe(true);
    }
  });

  test("filters with --rev range", () => {
    const log = generateGitLog({ repo: REPO, rev: "v1.0..v1.0.1" });
    expect(log.length).toBeGreaterThan(0);
    // Should be a small subset
    const allLog = generateGitLog({ repo: REPO });
    expect(log.length).toBeLessThan(allLog.length);
  });

  test("--rev removes --all (no other branches leak in)", () => {
    const log = generateGitLog({ repo: REPO, rev: "v1.0..v1.0.1" });
    const commits = extractDates(log);
    expect(commits.length).toBeGreaterThan(0);
    expect(commits.length).toBeLessThan(50);
  });

  test("returns empty string for future date filter", () => {
    const log = generateGitLog({ repo: REPO, after: "2099-01-01" });
    expect(log.trim()).toBe("");
  });

  test("combines --rev with --after", () => {
    const revOnly = generateGitLog({ repo: REPO, rev: "v1.0..v1.0.4" });
    const combined = generateGitLog({ repo: REPO, rev: "v1.0..v1.0.4", after: "2015-01-01" });
    const dates = extractDates(combined);
    // All dates must be >= the after boundary
    for (const d of dates) {
      expect(d >= "2015-01-01").toBe(true);
    }
    // Combined result must be a subset (no larger) than rev-only
    expect(combined.length).toBeLessThanOrEqual(revOnly.length);
  });

  test("throws on invalid repo path", () => {
    expect(() => generateGitLog({ repo: "/nonexistent/path" })).toThrow();
  });
});
