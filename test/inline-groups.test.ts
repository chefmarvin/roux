import { describe, test, expect } from "@jest/globals";
import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { run } from "../src/app";

const LOG = [
  "--aaa1111--2026-01-05--Alice--one",
  "10\t0\tsrc/api/handler.ts",
  "5\t0\tsrc/ui/button.tsx",
  "",
  "--bbb2222--2026-01-06--Alice--two",
  "3\t0\tsrc/api/router.ts",
  "2\t0\tdocs/readme.md",
  "",
].join("\n");

const LAYERS = ["src/api => API", "src/ui  => UI"].join("\n");

describe("inline group definitions", () => {
  test("groups entities without going through a file", () => {
    const rows = JSON.parse(
      run({ analysis: "revisions", input: LOG, groups: LAYERS, minRevs: 1, outputFormat: "json" }),
    ) as Array<{ entity: string; "n-revs": number }>;

    expect(rows).toEqual([
      { entity: "API", "n-revs": 2 },
      { entity: "UI", "n-revs": 1 },
    ]);
  });

  test("gives the same answer as the equivalent group file", () => {
    const dir = mkdtempSync(join(tmpdir(), "roux-groups-"));
    const file = join(dir, "layers.txt");
    writeFileSync(file, LAYERS);

    try {
      const inline = run({ analysis: "revisions", input: LOG, groups: LAYERS, minRevs: 1 });
      const fromFile = run({ analysis: "revisions", input: LOG, groupFile: file, minRevs: 1 });

      expect(inline).toBe(fromFile);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the CLI keeps working through -g", () => {
    const dir = mkdtempSync(join(tmpdir(), "roux-groups-cli-"));
    const log = join(dir, "git.log");
    const layers = join(dir, "layers.txt");
    writeFileSync(log, LOG);
    writeFileSync(layers, LAYERS);

    try {
      const output = execFileSync(
        "node",
        ["--import", "tsx", "src/cli.ts", "revisions", "-l", log, "-g", layers, "-n", "1"],
        { encoding: "utf-8", cwd: process.cwd() },
      );

      expect(output).toContain("API,2");
      expect(output).toContain("UI,1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
