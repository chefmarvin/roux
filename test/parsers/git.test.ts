import { describe, test, expect } from "@jest/globals";
import { parseGitLog } from "../../src/parsers/git";

const singleEntry = `[990442e] Adam Petersen 2013-08-29 Adapted the grammar after live tests (git)
1\t0\tproject.clj
2\t4\tsrc/code_maat/parsers/git.clj
`;

const binaryEntry = `[990442e] Adam Petersen 2013-11-10 Testing binary entries
-\t-\tproject.bin
2\t40\tsrc/code_maat/parsers/git.clj
`;

const multipleEntries = `[b777738] Adam Petersen 2013-08-29 git: parse merges and reverts too (grammar change)
10\t9\tsrc/code_maat/parsers/git.clj
32\t0\ttest/code_maat/parsers/git_test.clj

[a527b79] Adam Petersen 2013-08-29 git: proper error messages from instaparse
6\t2\tsrc/code_maat/parsers/git.clj
0\t7\ttest/code_maat/end_to_end/scenario_tests.clj
18\t0\ttest/code_maat/end_to_end/simple_git.txt
21\t0\ttest/code_maat/end_to_end/svn_live_data_test.clj

[a32793d] Ola Flisbäck 2015-09-29 Corrected date of self-awareness to 1997-08-29
1\t1\tREADME.md
`;

const pullRequests = `[0d3de0c] Mr X 2013-01-04 Merge pull request #1841 from adriaanm/rebase-6827-2.10.x
[77c8751] Mr Y 2013-01-04 SI-6915 Updates copyright properties to 2002-2013
1\t1\tbuild.xml
1\t1\tproject/Versions.scala
`;

const messageWithDate = `[611a2fe] User2 2016-03-11 (JIRA-789) Some text (see mails of 2016-03-11).
12\t3\tProject.UnitTests/Spec.cs
3\t3\tOtherProject.UnitTests/OtherSpec.cs
`;

describe("git format parser", () => {
  test("parses single entry with message", () => {
    const result = parseGitLog(singleEntry);
    expect(result).toEqual([
      { entity: "project.clj", author: "Adam Petersen", rev: "990442e",
        date: "2013-08-29", locAdded: 1, locDeleted: 0,
        message: "Adapted the grammar after live tests (git)" },
      { entity: "src/code_maat/parsers/git.clj", author: "Adam Petersen", rev: "990442e",
        date: "2013-08-29", locAdded: 2, locDeleted: 4,
        message: "Adapted the grammar after live tests (git)" },
    ]);
  });

  test("handles binary files with dash stats", () => {
    const result = parseGitLog(binaryEntry);
    expect(result[0].locAdded).toBe(-1);
    expect(result[0].locDeleted).toBe(-1);
    expect(result[0].entity).toBe("project.bin");
    expect(result[0].message).toBe("Testing binary entries");
    expect(result[1].locAdded).toBe(2);
    expect(result[1].locDeleted).toBe(40);
  });

  test("parses multiple entries", () => {
    const result = parseGitLog(multipleEntries);
    expect(result).toHaveLength(7);
    expect(result[0].rev).toBe("b777738");
    expect(result[0].message).toBe("git: parse merges and reverts too (grammar change)");
    expect(result[2].rev).toBe("a527b79");
    expect(result[2].message).toBe("git: proper error messages from instaparse");
    expect(result[6].rev).toBe("a32793d");
    expect(result[6].author).toBe("Ola Flisbäck");
    expect(result[6].message).toBe("Corrected date of self-awareness to 1997-08-29");
  });

  test("handles pull requests (empty commits before real ones)", () => {
    const result = parseGitLog(pullRequests);
    expect(result).toHaveLength(2);
    expect(result[0].author).toBe("Mr Y");
    expect(result[0].rev).toBe("77c8751");
    expect(result[0].message).toBe("SI-6915 Updates copyright properties to 2002-2013");
  });

  test("returns empty array for empty input", () => {
    expect(parseGitLog("")).toEqual([]);
    expect(parseGitLog("  \n  ")).toEqual([]);
  });

  test("ignores dates in commit messages", () => {
    const result = parseGitLog(messageWithDate);
    expect(result).toHaveLength(2);
    expect(result[0].author).toBe("User2");
    expect(result[0].date).toBe("2016-03-11");
    expect(result[0].message).toBe("(JIRA-789) Some text (see mails of 2016-03-11).");
    expect(result[1].entity).toBe("OtherProject.UnitTests/OtherSpec.cs");
  });
});
