import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { run } from "../src/app";

/**
 * The entry point: what a caller hands in, and what it does with the
 * combinations. This is where a release once went out broken — an empty
 * log read as "no log given", which sent every scripted run to analyse
 * whatever repository the process happened to be sitting in — so the
 * cases here are mostly about what the arguments mean together rather
 * than one at a time.
 */
describe("run", () => {
  const LOG = [
    "--aaa1111--2026-01-05--Alice--first",
    "1\t0\tsrc/a.ts",
    "2\t0\tsrc/b.ts",
    "",
    "--bbb2222--2026-01-06--Bob--second",
    "3\t1\tsrc/a.ts",
    "",
  ].join("\n");

  describe("what it refuses", () => {
    test("an analysis it does not have", () => {
      expect(() => run({ input: LOG, analysis: "nonsense" })).toThrow(/Unknown analysis "nonsense"/);
    });

    test("and says which ones it does have", () => {
      expect(() => run({ input: LOG, analysis: "nonsense" })).toThrow(/revisions/);
    });

    test("a log format it cannot read", () => {
      expect(() => run({ input: LOG, analysis: "revisions", logFormat: "svn2" as never })).toThrow(
        /Unknown log format "svn2"/,
      );
    });
  });

  describe("where the log comes from", () => {
    let repo: string;

    beforeEach(() => {
      repo = mkdtempSync(join(tmpdir(), "roux-app-"));
      const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, stdio: "ignore" });
      git("init", "-q", "-b", "main");
      git("config", "user.email", "t@e.com");
      git("config", "user.name", "Repo Author");
      writeFileSync(join(repo, "from-repo.ts"), "1\n");
      git("add", "-A");
      git("commit", "-m", "in the repository");
    });

    afterEach(() => rmSync(repo, { recursive: true, force: true }));

    test("text given outright wins over a repository", () => {
      expect(run({ input: LOG, repo, analysis: "revisions" })).toContain("src/a.ts");
      expect(run({ input: LOG, repo, analysis: "revisions" })).not.toContain("from-repo.ts");
    });

    test("an empty text is a history with nothing in it, not a missing one", () => {
      // The regression this file was written for: read as "nothing given",
      // this reports on whatever repository the process is sitting in.
      expect(run({ input: "", repo, analysis: "revisions" })).not.toContain("from-repo.ts");
    });

    test("a file wins over a repository", () => {
      const path = join(repo, "given.log");
      writeFileSync(path, LOG);

      expect(run({ log: path, repo, analysis: "revisions" })).toContain("src/a.ts");
    });

    test("a repository is read when nothing else is given", () => {
      expect(run({ repo, analysis: "revisions" })).toContain("from-repo.ts");
    });
  });

  describe("what it does with the rows", () => {
    test("keeps them all by default", () => {
      expect(run({ input: LOG, analysis: "revisions" }).trim().split("\n")).toHaveLength(3);
    });

    test("cuts them to the number asked for", () => {
      const lines = run({ input: LOG, analysis: "revisions", rows: 1 }).trim().split("\n");

      expect(lines).toHaveLength(2); // header plus one
    });

    test("ignores a count of zero rather than returning nothing", () => {
      expect(run({ input: LOG, analysis: "revisions", rows: 0 }).trim().split("\n")).toHaveLength(3);
    });

    test("writes JSON when asked", () => {
      const parsed = JSON.parse(run({ input: LOG, analysis: "revisions", outputFormat: "json" }));

      expect(parsed).toEqual([
        { entity: "src/a.ts", "n-revs": 2 },
        { entity: "src/b.ts", "n-revs": 1 },
      ]);
    });
  });

  describe("the transforms, each of which only runs when asked", () => {
    let directory: string;

    beforeEach(() => {
      directory = mkdtempSync(join(tmpdir(), "roux-app-files-"));
    });
    afterEach(() => rmSync(directory, { recursive: true, force: true }));

    test("grouping given inline", () => {
      const grouped = run({ input: LOG, analysis: "revisions", groups: "src => Core" });

      expect(grouped).toContain("Core");
      expect(grouped).not.toContain("src/a.ts");
    });

    test("grouping read from a file", () => {
      const path = join(directory, "groups.txt");
      writeFileSync(path, "src => Core\n");

      expect(run({ input: LOG, analysis: "revisions", groupFile: path })).toContain("Core");
    });

    test("inline grouping wins over a file", () => {
      const path = join(directory, "groups.txt");
      writeFileSync(path, "src => FromFile\n");

      const grouped = run({ input: LOG, analysis: "revisions", groups: "src => Inline", groupFile: path });

      expect(grouped).toContain("Inline");
      expect(grouped).not.toContain("FromFile");
    });

    test("a team map, which is a csv of author to team", () => {
      // The team names do not appear in this analysis; what changes is
      // that two people mapped to one team count as one.
      const path = join(directory, "teams.csv");
      writeFileSync(path, "author,team\nAlice,Platform\nBob,Platform\n");

      expect(run({ input: LOG, analysis: "authors" })).toContain("src/a.ts,2,2");
      expect(run({ input: LOG, analysis: "authors", teamMapFile: path })).toContain("src/a.ts,1,2");
    });

    test("grouping commits into a window of days", () => {
      // temporalPeriod is a number of days. It merges the commits inside
      // a window into one change, which is what coupling reads, so the
      // two files here become something that always moved together.
      const apart = run({ input: LOG, analysis: "coupling", minRevs: 1, minSharedRevs: 1 });
      const windowed = run({
        input: LOG,
        analysis: "coupling",
        temporalPeriod: 30,
        minRevs: 1,
        minSharedRevs: 1,
      });

      expect(apart).not.toBe(windowed);
    });

    test("none of them when none is asked for", () => {
      const plain = run({ input: LOG, analysis: "revisions" });

      expect(plain).toContain("src/a.ts");
      expect(plain).not.toContain("Core");
      expect(plain).not.toContain("Platform");
    });
  });

  describe("rename tracking", () => {
    const MOVED = [
      "--ccc3333--2026-01-07--Alice--move it",
      "0\t0\tsrc/{old.ts => new.ts}",
      "",
      "--aaa1111--2026-01-05--Alice--first",
      "1\t0\tsrc/old.ts",
      "",
    ].join("\n");

    test("credits the whole history to the new name by default", () => {
      const counted = run({ input: MOVED, analysis: "revisions" });

      expect(counted).toContain("src/new.ts");
      expect(counted).not.toContain("src/old.ts");
    });

    test("leaves the two names apart when told not to follow", () => {
      const counted = run({ input: MOVED, analysis: "revisions", followRenames: false });

      expect(counted).toContain("src/old.ts");
    });
  });
});
