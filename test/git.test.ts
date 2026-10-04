import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { generateGitLog } from "../src/git";
import { parseGit2Log } from "../src/parsers/git2";

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

  test("followRenames=true (default) generates log with -M (rename detection)", () => {
    const log = generateGitLog({ repo: REPO });
    // Should succeed without error — -M is valid git flag
    expect(log.length).toBeGreaterThan(0);
  });

  test("followRenames=false generates log with --no-renames", () => {
    const log = generateGitLog({ repo: REPO, followRenames: false });
    expect(log.length).toBeGreaterThan(0);
  });
});

describe("date boundaries", () => {
  const BOUNDARY = "2025-09-01";
  let repo: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "roux-dates-"));
    const at = `${BOUNDARY}T12:00:00`;
    const git = (...args: string[]) =>
      execFileSync("git", args, {
        cwd: repo,
        stdio: ["ignore", "pipe", "ignore"],
        env: { ...process.env, GIT_AUTHOR_DATE: at, GIT_COMMITTER_DATE: at },
      });

    git("init", "-q");
    git("config", "user.email", "t@example.com");
    git("config", "user.name", "T");
    writeFileSync(join(repo, "a.ts"), "const a = 1;\n");
    git("add", "-A");
    git("commit", "-m", "midday on the boundary");
  });

  afterEach(() => rmSync(repo, { recursive: true, force: true }));

  // git resolves a bare date through approxidate, which fills the missing
  // time from the clock rather than from midnight, so a commit made earlier
  // in the day falls outside --after=<that day> depending on when the
  // analysis runs. The range must mean the whole day at both ends.
  test("--after keeps commits made on the boundary date", () => {
    expect(extractDates(generateGitLog({ repo, after: BOUNDARY }))).toEqual([BOUNDARY]);
  });

  test("--before keeps commits made on the boundary date", () => {
    expect(extractDates(generateGitLog({ repo, before: BOUNDARY }))).toEqual([BOUNDARY]);
  });
});

describe("paths git would quote", () => {
  let repo: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "roux-quoted-"));
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: repo, stdio: "ignore" });
    git("init", "-q");
    git("config", "user.email", "t@e.com");
    git("config", "user.name", "T");
    writeFileSync(join(repo, "说明.ts"), "const a = 1;\n");
    git("add", "-A");
    git("commit", "-m", "add");
  });

  afterEach(() => rmSync(repo, { recursive: true, force: true }));

  // git quotes and octal-escapes any path outside ASCII by default, which
  // no consumer of the log expects: a quoted path matches no glob, no
  // group definition and no listing of the working tree.
  test("records a non-ASCII path as it is on disk", () => {
    const log = generateGitLog({ repo });

    expect(log).toContain("说明.ts");
    expect(log).not.toContain("\\346");
  });
});

describe("what generateGitLog writes, parseGit2Log reads", () => {
  let repo: string;

  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, stdio: "ignore" });

  const commit = (date: string, subject: string, write: () => void) => {
    write();
    git("add", "-A");
    execFileSync("git", ["commit", "-m", subject], {
      cwd: repo,
      stdio: "ignore",
      env: { ...process.env, GIT_AUTHOR_DATE: `${date}T12:00:00`, GIT_COMMITTER_DATE: `${date}T12:00:00` },
    });
  };

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "roux-roundtrip-"));
    git("init", "-q", "-b", "main");
    git("config", "user.email", "alice@e.com");
    git("config", "user.name", "Alice");
    commit("2026-01-05", "first commit", () => writeFileSync(join(repo, "a.ts"), "one\ntwo\n"));
    commit("2026-01-06", "grow it", () => writeFileSync(join(repo, "a.ts"), "one\ntwo\nthree\n"));
  });

  afterEach(() => rmSync(repo, { recursive: true, force: true }));

  // The format string lives in git.ts and the code that takes it apart
  // lives in parsers/git2.ts. Nothing had ever held the two together, so
  // the quotes the shell used to eat were invisible either way.
  test("round-trips every field of a commit", () => {
    const parsed = parseGit2Log(generateGitLog({ repo }));

    expect(parsed).toEqual([
      {
        rev: expect.stringMatching(/^[0-9a-f]+$/),
        entity: "a.ts",
        author: "Alice",
        date: "2026-01-06",
        message: "grow it",
        locAdded: 1,
        locDeleted: 0,
      },
      {
        rev: expect.stringMatching(/^[0-9a-f]+$/),
        entity: "a.ts",
        author: "Alice",
        date: "2026-01-05",
        message: "first commit",
        locAdded: 2,
        locDeleted: 0,
      },
    ]);
  });

  test("leaves no quoting around the fields", () => {
    // The format was written for a shell, which ate the quotes it needed.
    // Run without one and they would arrive as part of the data.
    const log = generateGitLog({ repo });

    expect(log).not.toContain("'--");
    expect(log.split("\n")[0]).toMatch(/^--[0-9a-f]+--2026-01-06--Alice--grow it$/);
  });

  test("a subject containing the delimiter still parses", () => {
    commit("2026-01-07", "fix -- really -- this time", () =>
      writeFileSync(join(repo, "b.ts"), "x\n"),
    );

    const parsed = parseGit2Log(generateGitLog({ repo }));

    expect(parsed[0]).toMatchObject({ entity: "b.ts", author: "Alice" });
  });
});
