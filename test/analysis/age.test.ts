import { describe, test, expect } from "@jest/globals";
import { age } from "../../src/analysis/age";
import type { Modification } from "../../src/parsers/types";
import type { AnalysisOptions } from "../../src/analysis/types";

const opts: AnalysisOptions = {
  minRevs: 1, minSharedRevs: 1, minCoupling: 50,
  maxCoupling: 100, maxChangesetSize: 10,
};

const ageData: Modification[] = [
  { entity: "A", rev: "1", author: "at", date: "2013-12-25", locAdded: 1, locDeleted: 0 },
  { entity: "A", rev: "2", author: "at", date: "2014-02-28", locAdded: 1, locDeleted: 0 },
  { entity: "A", rev: "3", author: "at", date: "2014-04-05", locAdded: 1, locDeleted: 0 },
  { entity: "B", rev: "1", author: "at", date: "2013-12-31", locAdded: 1, locDeleted: 0 },
];

describe("age", () => {
  test("calculates age in months from reference date", () => {
    const result = age(ageData, { ...opts, ageTimeNow: "2014-04-06" });
    expect(result).toEqual([
      { entity: "A", "age-months": 0 },
      { entity: "B", "age-months": 3 },
    ]);
  });

  test("calculates age with a later reference date", () => {
    const result = age(ageData, { ...opts, ageTimeNow: "2015-04-06" });
    expect(result).toEqual([
      { entity: "A", "age-months": 12 },
      { entity: "B", "age-months": 15 },
    ]);
  });
});
