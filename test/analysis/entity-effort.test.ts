import { describe, test, expect } from "@jest/globals";
import { entityEffort } from "../../src/analysis/entity-effort";
import type { Modification } from "../../src/parsers/types";
import { lowThresholds } from "../fixtures/test-data";

describe("entity-effort", () => {
  const data: Modification[] = [
    { entity: "A", rev: "1", author: "xy", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
    { entity: "A", rev: "2", author: "xy", date: "2013-01-02", locAdded: 1, locDeleted: 0 },
    { entity: "A", rev: "3", author: "xy", date: "2013-01-03", locAdded: 1, locDeleted: 0 },
    { entity: "A", rev: "1", author: "zt", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
    { entity: "A", rev: "2", author: "zt", date: "2013-01-02", locAdded: 1, locDeleted: 0 },
    { entity: "A", rev: "3", author: "at", date: "2013-01-03", locAdded: 1, locDeleted: 0 },
  ];

  test("counts unique revisions per author and total revs per entity", () => {
    const result = entityEffort(data, lowThresholds);
    expect(result).toEqual([
      { entity: "A", author: "xy", "author-revs": 3, "total-revs": 6 },
      { entity: "A", author: "zt", "author-revs": 2, "total-revs": 6 },
      { entity: "A", author: "at", "author-revs": 1, "total-revs": 6 },
    ]);
  });

  test("sorts by entity asc, then by author-revs desc within entity", () => {
    const multiEntity: Modification[] = [
      { entity: "B", rev: "1", author: "ab", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
      { entity: "A", rev: "1", author: "cd", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
      { entity: "A", rev: "2", author: "cd", date: "2013-01-02", locAdded: 1, locDeleted: 0 },
    ];
    const result = entityEffort(multiEntity, lowThresholds);
    expect(result).toEqual([
      { entity: "A", author: "cd", "author-revs": 2, "total-revs": 2 },
      { entity: "B", author: "ab", "author-revs": 1, "total-revs": 1 },
    ]);
  });

  test("returns empty array for empty input", () => {
    const result = entityEffort([], lowThresholds);
    expect(result).toEqual([]);
  });
});
