import { describe, test, expect } from "@jest/globals";
import { fragmentation } from "../../src/analysis/fragmentation";
import type { Modification } from "../../src/parsers/types";
import { lowThresholds } from "../fixtures/test-data";

describe("fragmentation", () => {
  test("single author entity has fractal value 0", () => {
    const data: Modification[] = [
      { entity: "A", rev: "1", author: "xy", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
      { entity: "A", rev: "2", author: "xy", date: "2013-01-02", locAdded: 1, locDeleted: 0 },
    ];
    const result = fragmentation(data, lowThresholds);
    expect(result).toEqual([
      { entity: "A", "fractal-value": 0, "total-revs": 2 },
    ]);
  });

  test("calculates fractal value for multiple authors", () => {
    const data: Modification[] = [
      { entity: "A", rev: "1", author: "xy", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
      { entity: "A", rev: "2", author: "xy", date: "2013-01-02", locAdded: 1, locDeleted: 0 },
      { entity: "A", rev: "3", author: "xy", date: "2013-01-03", locAdded: 1, locDeleted: 0 },
      { entity: "A", rev: "1", author: "zt", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
      { entity: "A", rev: "2", author: "zt", date: "2013-01-02", locAdded: 1, locDeleted: 0 },
      { entity: "A", rev: "3", author: "at", date: "2013-01-03", locAdded: 1, locDeleted: 0 },
    ];
    // xy=3/6, zt=2/6, at=1/6
    // fractal = 1 - ((9/36) + (4/36) + (1/36)) = 1 - 14/36 = 1 - 0.3889 = 0.61
    const result = fragmentation(data, lowThresholds);
    expect(result).toEqual([
      { entity: "A", "fractal-value": 0.61, "total-revs": 6 },
    ]);
  });

  test("sorts by fractal-value descending", () => {
    const data: Modification[] = [
      // Entity B: single author -> fractal = 0
      { entity: "B", rev: "1", author: "xy", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
      // Entity A: two equal authors -> fractal = 1 - 2*(0.5)^2 = 0.5
      { entity: "A", rev: "1", author: "xy", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
      { entity: "A", rev: "2", author: "zt", date: "2013-01-02", locAdded: 1, locDeleted: 0 },
    ];
    const result = fragmentation(data, lowThresholds);
    expect(result).toEqual([
      { entity: "A", "fractal-value": 0.5, "total-revs": 2 },
      { entity: "B", "fractal-value": 0, "total-revs": 1 },
    ]);
  });

  test("returns empty array for empty input", () => {
    const result = fragmentation([], lowThresholds);
    expect(result).toEqual([]);
  });
});
