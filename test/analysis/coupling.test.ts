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
  test("excludes oversized changesets from each entity's revision count", () => {
    // A and B co-change in 2 small commits. A also appears in one huge
    // commit that exceeds maxChangesetSize. code-maat drops that commit
    // entirely (coupling_algos.clj removes it before counting revisions),
    // so A counts 2 revisions, not 3, and the pair's degree stays at 100.
    const huge = Array.from({ length: 12 }, (_, i) => mod(`filler${i}`, "9"));
    const data = [
      mod("A", "1"), mod("B", "1"),
      mod("A", "2"), mod("B", "2"),
      mod("A", "9"), ...huge,
    ];

    expect(coupling(data, { ...opts, maxChangesetSize: 10 })).toEqual([
      { entity: "A", coupled: "B", degree: 100, "average-revs": 2 },
    ]);
  });

  test("thresholds on the pair's average revisions, not on each entity", () => {
    // A changes 10 times, B twice, and the two change together twice.
    // The average is 6, so the pair clears a min-revs of 5 even though B
    // on its own does not. code-maat filters on that average
    // (logical_coupling.clj passes average-revs to within-threshold?).
    const data = [
      ...Array.from({ length: 10 }, (_, i) => mod("A", String(i + 1))),
      mod("B", "1"),
      mod("B", "2"),
    ];

    expect(coupling(data, { ...opts, minRevs: 5, minCoupling: 1 })).toEqual([
      { entity: "A", coupled: "B", degree: 33, "average-revs": 6 },
    ]);
  });

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
  test("counts oversized changesets, unlike the coupling analysis", () => {
    // code-maat applies the changeset-size filter only in
    // co-changing-by-revision, which soc does not call
    // (sum_of_coupling.clj has its own entities-by-revision without it).
    const huge = Array.from({ length: 12 }, (_, i) => mod(`f${i}`, "1"));

    const result = sumOfCoupling(huge, { ...opts, maxChangesetSize: 10, minRevs: 1 });

    expect(result).toHaveLength(12);
    expect(result[0]).toEqual({ entity: "f0", soc: 11 });
  });

  test("measures total coupling per entity", () => {
    const result = sumOfCoupling(coupled, opts);
    expect(result).toEqual([
      { entity: "A", soc: 3 },
      { entity: "B", soc: 3 },
      { entity: "C", soc: 2 },
    ]);
  });
});
