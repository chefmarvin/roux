import { describe, test, expect } from "@jest/globals";
import { absoluteChurn, churnByEntity, churnByAuthor } from "../../src/analysis/churn";
import type { Modification } from "../../src/parsers/types";
import type { AnalysisOptions } from "../../src/analysis/types";

const opts: AnalysisOptions = {
  minRevs: 1, minSharedRevs: 1, minCoupling: 50,
  maxCoupling: 100, maxChangesetSize: 10,
};

const simple: Modification[] = [
  { entity: "B", rev: "2", author: "ta", date: "2013-11-11", locAdded: 20, locDeleted: 2 },
  { entity: "A", rev: "1", author: "at", date: "2013-11-10", locAdded: 10, locDeleted: 1 },
  { entity: "B", rev: "1", author: "at", date: "2013-11-10", locAdded: 1, locDeleted: 1 },
  { entity: "B", rev: "3", author: "at", date: "2013-11-11", locAdded: 2, locDeleted: 0 },
];

const withBinary: Modification[] = [
  { entity: "binary", rev: "1", author: "at", date: "2013-11-10", locAdded: -1, locDeleted: -1 },
];

describe("absoluteChurn", () => {
  test("calculates churn by date", () => {
    const result = absoluteChurn(simple, opts);
    expect(result).toEqual([
      { date: "2013-11-10", added: 11, deleted: 2, commits: 1 },
      { date: "2013-11-11", added: 22, deleted: 2, commits: 2 },
    ]);
  });

  test("counts binary files as zero churn", () => {
    const result = absoluteChurn(withBinary, opts);
    expect(result).toEqual([
      { date: "2013-11-10", added: 0, deleted: 0, commits: 1 },
    ]);
  });
});

describe("churnByEntity", () => {
  test("calculates churn per entity sorted by added lines", () => {
    const result = churnByEntity(simple, opts);
    expect(result).toEqual([
      { entity: "B", added: 23, deleted: 3, commits: 3 },
      { entity: "A", added: 10, deleted: 1, commits: 1 },
    ]);
  });
});

describe("churnByAuthor", () => {
  test("calculates churn per author sorted by added lines", () => {
    const result = churnByAuthor(simple, opts);
    expect(result).toEqual([
      { author: "ta", added: 20, deleted: 2, commits: 1 },
      { author: "at", added: 13, deleted: 2, commits: 2 },
    ]);
  });
});
