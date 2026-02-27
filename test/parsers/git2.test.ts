import { describe, test, expect } from "@jest/globals";
import { parseGit2Log } from "../../src/parsers/git2";

const singleEntry = `--990442e--2013-08-29--Adam Petersen
1\t0\tproject.clj
2\t4\tsrc/code_maat/parsers/git.clj
`;

const binaryEntry = `--990442e--2013-11-10--Adam Petersen
-\t-\tproject.bin
2\t40\tsrc/code_maat/parsers/git.clj
`;

const multipleEntries = `--b777738--2013-08-29--Adam Petersen
10\t9\tsrc/code_maat/parsers/git.clj
32\t0\ttest/code_maat/parsers/git_test.clj

--a527b79--2013-08-29--Adam Petersen
6\t2\tsrc/code_maat/parsers/git.clj
0\t7\ttest/code_maat/end_to_end/scenario_tests.clj
18\t0\ttest/code_maat/end_to_end/simple_git.txt
21\t0\ttest/code_maat/end_to_end/svn_live_data_test.clj
`;

const pullRequests = `--0d3de0c--2013-01-04--Mr X
--77c8751--2013-01-04--Mr Y
1\t1\tbuild.xml
1\t1\tproject/Versions.scala
`;

describe("git2 parser", () => {
  test("parses single entry", () => {
    const result = parseGit2Log(singleEntry);
    expect(result).toEqual([
      { entity: "project.clj", author: "Adam Petersen", rev: "990442e",
        date: "2013-08-29", locAdded: 1, locDeleted: 0 },
      { entity: "src/code_maat/parsers/git.clj", author: "Adam Petersen", rev: "990442e",
        date: "2013-08-29", locAdded: 2, locDeleted: 4 },
    ]);
  });

  test("handles binary files with dash stats", () => {
    const result = parseGit2Log(binaryEntry);
    expect(result[0].locAdded).toBe(-1);
    expect(result[0].locDeleted).toBe(-1);
    expect(result[0].entity).toBe("project.bin");
    expect(result[1].locAdded).toBe(2);
    expect(result[1].locDeleted).toBe(40);
  });

  test("parses multiple entries", () => {
    const result = parseGit2Log(multipleEntries);
    expect(result).toHaveLength(6);
    expect(result[0].rev).toBe("b777738");
    expect(result[2].rev).toBe("a527b79");
    expect(result[0].locAdded).toBe(10);
    expect(result[0].locDeleted).toBe(9);
  });

  test("handles pull requests (empty commits before real ones)", () => {
    const result = parseGit2Log(pullRequests);
    expect(result).toHaveLength(2);
    expect(result[0].author).toBe("Mr Y");
    expect(result[0].rev).toBe("77c8751");
  });

  test("returns empty array for empty input", () => {
    expect(parseGit2Log("")).toEqual([]);
    expect(parseGit2Log("  \n  ")).toEqual([]);
  });

  test("parses optional commit message from extended git2 format", () => {
    const log = "--abc123--2024-01-15--Author Name--fix: some bug\n1\t0\tsrc/foo.ts\n";
    const result = parseGit2Log(log);
    expect(result[0].message).toBe("fix: some bug");
  });

  test("handles missing message (standard git2 format)", () => {
    const log = "--abc123--2024-01-15--Author Name\n1\t0\tsrc/foo.ts\n";
    const result = parseGit2Log(log);
    expect(result[0].message).toBeUndefined();
  });

  test("handles message containing double dashes", () => {
    const log = "--abc123--2024-01-15--Author--msg with -- dashes\n1\t0\tsrc/foo.ts\n";
    const result = parseGit2Log(log);
    expect(result[0].message).toBe("msg with -- dashes");
  });
});
