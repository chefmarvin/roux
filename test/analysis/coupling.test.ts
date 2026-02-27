import { describe, test, expect } from "@jest/globals";
import { coupling, sumOfCoupling } from "../../src/analysis/coupling";
import type { Modification } from "../../src/parsers/types";
import type { AnalysisOptions } from "../../src/analysis/types";

const opts: AnalysisOptions = {
  minRevs: 1, minSharedRevs: 1, minCoupling: 50,
  maxCoupling: 100, maxChangesetSize: 10,
};

function mod(entity: string, rev: string): Modification {
  return { entity, rev, author: "x", date: "2023-01-01", locAdded: 0, locDeleted: 0 };
}

const singleEntity = [mod("This/is/a/single/entity", "1")];

const oneRevision = [mod("A", "1"), mod("B", "1"), mod("C", "1")];

const coupled = [
  mod("A", "1"), mod("B", "1"), mod("C", "1"),
  mod("A", "2"), mod("B", "2"),
];

describe("coupling", () => {
  test("returns empty for single entity commit", () => {
    expect(coupling(singleEntity, opts)).toEqual([]);
  });

  test("calculates coupling degree between co-changing entities", () => {
    const result = coupling(coupled, opts);
    expect(result).toEqual([
      { entity: "A", coupled: "B", degree: 100, "average-revs": 2 },
      { entity: "A", coupled: "C", degree: 66, "average-revs": 2 },
      { entity: "B", coupled: "C", degree: 66, "average-revs": 2 },
    ]);
  });
});

describe("sumOfCoupling", () => {
  test("measures total coupling per entity", () => {
    const result = sumOfCoupling(coupled, opts);
    expect(result).toEqual([
      { entity: "A", soc: 3 },
      { entity: "B", soc: 3 },
      { entity: "C", soc: 2 },
    ]);
  });
});
