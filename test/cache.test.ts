import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { generateGitLog } from "../src/git";
import { cacheLocation } from "../src/cache";

/**
 * A cached log has to answer the question a first run would have
 * answered. Every case here asks exactly that, because a cache that gets
 * it wrong does not fail — it reports a different history, and the report
 * built on it looks entirely normal.
 */
describe("cached logs", () => {
  let repo: string;
  let cacheDir: string;

  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: repo, stdio: ["ignore", "pipe", "ignore"] }).toString();

  const commit = (name: string, date = "2026-01-05") => {
    writeFileSync(join(repo, name), `${name}\n`);
    git("add", "-A");
    execFileSync("git", ["commit", "-m", name], {
      cwd: repo,
      stdio: "ignore",
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: `${date}T12:00:00`,
        GIT_COMMITTER_DATE: `${date}T12:00:00`,
      },
    });
  };

  /** What the log says, in the terms every analysis reads it by. */
  const summary = (log: string) => ({
    files: [...log.matchAll(/^[\d-]+\t[\d-]+\t(.+)$/gm)].map((m) => m[1]).sort(),
    authors: [...new Set([...log.matchAll(/^--\w+--[\d-]+--([^-]*)--/gm)].map((m) => m[1]))].sort(),
  });

  const cached = () => summary(generateGitLog({ repo, cache: true, cacheDir }));
  const fresh = () => summary(generateGitLog({ repo }));

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "roux-cache-"));
    cacheDir = mkdtempSync(join(tmpdir(), "roux-cachedir-"));
    git("init", "-q", "-b", "main");
    git("config", "user.email", "old@e.com");
    git("config", "user.name", "Old Name");
    commit("a.ts");
    commit("b.ts", "2026-01-06");
    cached(); // prime
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
  });

  describe("agrees with a first run after", () => {
    test("nothing at all", () => {
      expect(cached()).toEqual(fresh());
    });

    test("a commit on the current branch", () => {
      commit("c.ts", "2026-01-07");
      expect(cached()).toEqual(fresh());
    });

    test("a commit on a branch that is not checked out", () => {
      // HEAD does not move, but --all covers the new commit.
      git("checkout", "-q", "-b", "side");
      commit("s.ts", "2026-01-07");
      git("checkout", "-q", "main");

      expect(cached()).toEqual(fresh());
      expect(cached().files).toContain("s.ts");
    });

    test("an amended commit", () => {
      execFileSync("git", ["commit", "--amend", "-m", "amended", "--no-edit"], {
        cwd: repo,
        stdio: "ignore",
        env: {
          ...process.env,
          GIT_AUTHOR_DATE: "2026-01-06T12:00:00",
          GIT_COMMITTER_DATE: "2026-01-06T12:00:00",
        },
      });
      expect(cached()).toEqual(fresh());
    });

    test("a deleted branch", () => {
      git("checkout", "-q", "-b", "doomed");
      commit("d.ts", "2026-01-07");
      git("checkout", "-q", "main");
      cached();
      git("branch", "-D", "doomed");

      expect(cached()).toEqual(fresh());
    });

    test("a new tag", () => {
      commit("c.ts", "2026-01-07");
      git("tag", "v1");
      expect(cached()).toEqual(fresh());
    });

    test("a merge", () => {
      git("checkout", "-q", "-b", "feature");
      commit("f.ts", "2026-01-07");
      git("checkout", "-q", "main");
      execFileSync("git", ["merge", "--no-ff", "-m", "merge feature", "feature"], {
        cwd: repo,
        stdio: "ignore",
        env: {
          ...process.env,
          GIT_AUTHOR_DATE: "2026-01-08T12:00:00",
          GIT_COMMITTER_DATE: "2026-01-08T12:00:00",
        },
      });
      expect(cached()).toEqual(fresh());
    });

    test("a stash", () => {
      writeFileSync(join(repo, "a.ts"), "dirty\n");
      git("stash", "push", "-q", "-m", "wip");
      expect(cached()).toEqual(fresh());
    });

    test("a garbage collection", () => {
      git("gc", "--prune=now", "-q");
      expect(cached()).toEqual(fresh());
    });

    test("several rounds in a row, naming nothing twice", () => {
      commit("c.ts", "2026-01-07");
      cached();
      commit("d.ts", "2026-01-08");
      cached();
      commit("e.ts", "2026-01-09");

      const { files } = cached();
      expect(files).toEqual([...new Set(files)].sort());
      expect(cached()).toEqual(fresh());
    });
  });

  describe("configuration that would change the log", () => {
    // Everything the command states outright, a repository's config
    // cannot move. These pin that, so that dropping one of those
    // arguments shows up here rather than in somebody's report.
    test.each([
      ["log.date", "iso"],
      ["diff.renames", "false"],
      ["core.quotePath", "true"],
    ])("%s=%s does not reach the output", (key, value) => {
      const before = generateGitLog({ repo });
      git("config", key, value);

      expect(generateGitLog({ repo })).toBe(before);
    });

    test("a changed .mailmap rebuilds the cache", () => {
      // %aN is the author name as .mailmap maps it, and .mailmap is not
      // in any ref — so the log changes while the refs do not. It has to
      // be part of what makes a cache fresh, or every report about people
      // keeps answering with names the repository has retired.
      expect(cached().authors).toEqual(["Old Name"]);

      writeFileSync(join(repo, ".mailmap"), "New Name <new@e.com> Old Name <old@e.com>\n");

      expect(cached().authors).toEqual(["New Name"]);
      expect(cached()).toEqual(fresh());
    });

    test("removing .mailmap rebuilds it again", () => {
      writeFileSync(join(repo, ".mailmap"), "New Name <new@e.com> Old Name <old@e.com>\n");
      cached();
      rmSync(join(repo, ".mailmap"));

      expect(cached().authors).toEqual(["Old Name"]);
    });
  });

  describe("what shares a cache and what does not", () => {
    test("a different rename setting gets its own", () => {
      const following = cacheLocation({ repo, followRenames: true, cacheDir });
      const not = cacheLocation({ repo, followRenames: false, cacheDir });

      expect(following).not.toBe(not);
    });

    test("a narrowed range is not cached at all", () => {
      // A log cut down to a range is not this repository's history, and
      // storing it under the same name would hand the next run, asking a
      // wider question, an answer missing most of it.
      const before = readdirSync(cacheDir);

      generateGitLog({ repo, cache: true, cacheDir, after: "2026-01-06" });

      expect(readdirSync(cacheDir)).toEqual(before);
    });

    test("a named revision is not cached either", () => {
      const before = readdirSync(cacheDir);

      generateGitLog({ repo, cache: true, cacheDir, rev: "HEAD~1..HEAD" });

      expect(readdirSync(cacheDir)).toEqual(before);
    });

    test("a range still gives the same answer as going straight to git", () => {
      expect(generateGitLog({ repo, cache: true, cacheDir, after: "2026-01-06" })).toBe(
        generateGitLog({ repo, after: "2026-01-06" }),
      );
    });

    test("caching is off unless asked for", () => {
      const elsewhere = mkdtempSync(join(tmpdir(), "roux-untouched-"));

      generateGitLog({ repo, cacheDir: elsewhere });

      expect(readdirSync(elsewhere)).toEqual([]);
      rmSync(elsewhere, { recursive: true, force: true });
    });
  });

  describe("a repository with nothing in it", () => {
    test("has no history to cache", () => {
      const empty = mkdtempSync(join(tmpdir(), "roux-empty-"));
      const emptyCache = mkdtempSync(join(tmpdir(), "roux-empty-cache-"));
      execFileSync("git", ["init", "-q"], { cwd: empty, stdio: "ignore" });

      expect(generateGitLog({ repo: empty, cache: true, cacheDir: emptyCache })).toBe("");

      rmSync(empty, { recursive: true, force: true });
      rmSync(emptyCache, { recursive: true, force: true });
    });

    test("reads back the nothing it wrote", () => {
      const empty = mkdtempSync(join(tmpdir(), "roux-empty2-"));
      const emptyCache = mkdtempSync(join(tmpdir(), "roux-empty2-cache-"));
      execFileSync("git", ["init", "-q"], { cwd: empty, stdio: "ignore" });

      generateGitLog({ repo: empty, cache: true, cacheDir: emptyCache });

      expect(generateGitLog({ repo: empty, cache: true, cacheDir: emptyCache })).toBe("");

      rmSync(empty, { recursive: true, force: true });
      rmSync(emptyCache, { recursive: true, force: true });
    });
  });

  describe("the file on disk", () => {
    test("is left alone when it is in a format we no longer write", () => {
      writeFileSync(cacheLocation({ repo, cacheDir }), "something older\n1\t0\tz.ts\n");

      expect(cached().files).not.toContain("z.ts");
    });

    test("never appears half written", () => {
      // Written to one side and moved into place, so a run cut short
      // leaves the previous answer rather than a truncated one.
      commit("c.ts", "2026-01-07");
      cached();

      const location = cacheLocation({ repo, cacheDir });
      expect(existsSync(location)).toBe(true);
      expect(readdirSync(cacheDir).filter((n) => !n.endsWith(".log"))).toEqual([]);
    });
  });
});

describe("the suite's own footprint", () => {
  test("writes nowhere near the cache of whoever ran it", () => {
    // Caching is off by default and these tests name their own directory,
    // so nothing should reach the real one. The redirect is what makes
    // that true of tests not written yet.
    expect(process.env.XDG_CACHE_HOME).toBeDefined();
    expect(cacheLocation({ repo: "/somewhere/else" })).not.toContain(join(homedir(), ".cache"));
  });
});
