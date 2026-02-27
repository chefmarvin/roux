import { describe, test, expect } from "@jest/globals";
import { identity } from "../../src/analysis/identity";
import type { Modification } from "../../src/parsers/types";
import type { AnalysisOptions } from "../../src/analysis/types";

const opts: AnalysisOptions = {
  minRevs: 1, minSharedRevs: 1, minCoupling: 50,
  maxCoupling: 100, maxChangesetSize: 10,
};

describe("identity", () => {
  test("returns all modifications as-is", () => {
    const data: Modification[] = [
      { entity: "A", rev: "1", author: "at", date: "2013-11-10", locAdded: 10, locDeleted: 1 },
      { entity: "B", rev: "2", author: "xy", date: "2013-11-11", locAdded: 5, locDeleted: 2 },
    ];
    const result = identity(data, opts);
    expect(result).toEqual([
      { author: "at", entity: "A", rev: "1", date: "2013-11-10", locAdded: 10, locDeleted: 1 },
      { author: "xy", entity: "B", rev: "2", date: "2013-11-11", locAdded: 5, locDeleted: 2 },
    ]);
  });

  test("includes message field when present", () => {
    const data: Modification[] = [
      { entity: "A", rev: "1", author: "at", date: "2013-11-10", locAdded: 1, locDeleted: 0, message: "fix bug" },
    ];
    const result = identity(data, opts);
    expect(result).toEqual([
      { author: "at", entity: "A", rev: "1", date: "2013-11-10", locAdded: 1, locDeleted: 0, message: "fix bug" },
    ]);
  });

  test("omits message field when undefined", () => {
    const data: Modification[] = [
      { entity: "A", rev: "1", author: "at", date: "2013-11-10", locAdded: 1, locDeleted: 0 },
    ];
    const result = identity(data, opts);
    expect(result[0]).not.toHaveProperty("message");
  });
});
