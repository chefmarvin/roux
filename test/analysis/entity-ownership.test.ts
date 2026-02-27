import { describe, test, expect } from "@jest/globals";
import { entityOwnership } from "../../src/analysis/entity-ownership";
import type { Modification } from "../../src/parsers/types";
import type { AnalysisOptions } from "../../src/analysis/types";

const opts: AnalysisOptions = {
  minRevs: 1, minSharedRevs: 1, minCoupling: 50,
  maxCoupling: 100, maxChangesetSize: 10,
};

const ownershipData: Modification[] = [
  { entity: "A", rev: "1", author: "at", date: "2013-11-10", locAdded: 10, locDeleted: 1 },
  { entity: "A", rev: "2", author: "at", date: "2013-11-11", locAdded: 2, locDeleted: 5 },
  { entity: "A", rev: "3", author: "xy", date: "2013-11-12", locAdded: 7, locDeleted: 1 },
  { entity: "A", rev: "4", author: "xy", date: "2013-11-13", locAdded: 8, locDeleted: 2 },
];

describe("entityOwnership", () => {
  test("sums added/deleted per author per entity, sorted by entity then added desc", () => {
    const result = entityOwnership(ownershipData, opts);
    expect(result).toEqual([
      { entity: "A", author: "xy", added: 15, deleted: 3 },
      { entity: "A", author: "at", added: 12, deleted: 6 },
    ]);
  });

  test("handles binary files (locAdded/locDeleted = -1) as zero", () => {
    const data: Modification[] = [
      { entity: "bin.png", rev: "1", author: "at", date: "2013-11-10", locAdded: -1, locDeleted: -1 },
    ];
    const result = entityOwnership(data, opts);
    expect(result).toEqual([
      { entity: "bin.png", author: "at", added: 0, deleted: 0 },
    ]);
  });

  test("sorts multiple entities alphabetically", () => {
    const data: Modification[] = [
      { entity: "B", rev: "1", author: "at", date: "2013-11-10", locAdded: 5, locDeleted: 1 },
      { entity: "A", rev: "1", author: "at", date: "2013-11-10", locAdded: 3, locDeleted: 0 },
    ];
    const result = entityOwnership(data, opts);
    expect(result).toEqual([
      { entity: "A", author: "at", added: 3, deleted: 0 },
      { entity: "B", author: "at", added: 5, deleted: 1 },
    ]);
  });
});
