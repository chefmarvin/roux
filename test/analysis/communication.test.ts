import { describe, test, expect } from "@jest/globals";
import { communication } from "../../src/analysis/communication";
import type { Modification } from "../../src/parsers/types";
import { lowThresholds } from "../fixtures/test-data";

const data: Modification[] = [
  { entity: "A", rev: "1", author: "at", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
  { entity: "A", rev: "1", author: "jt", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
  { entity: "A", rev: "1", author: "ap", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
  { entity: "B", rev: "2", author: "at", date: "2013-01-02", locAdded: 1, locDeleted: 0 },
  { entity: "B", rev: "2", author: "jt", date: "2013-01-02", locAdded: 1, locDeleted: 0 },
];

describe("communication", () => {
  test("calculates communication strength between author pairs", () => {
    const result = communication(data, lowThresholds);

    // at-jt and jt-at: shared=2, avg=2, strength=100
    // at-ap, ap-at, jt-ap, ap-jt: shared=1, avg=2, strength=50
    expect(result).toHaveLength(6);

    // First two entries should have strength 100
    const top = result.filter((r) => r.strength === 100);
    expect(top).toHaveLength(2);
    expect(top).toEqual(
      expect.arrayContaining([
        { author: "at", peer: "jt", shared: 2, average: 2, strength: 100 },
        { author: "jt", peer: "at", shared: 2, average: 2, strength: 100 },
      ])
    );

    // Remaining four entries should have strength 50
    const rest = result.filter((r) => r.strength === 50);
    expect(rest).toHaveLength(4);
    expect(rest).toEqual(
      expect.arrayContaining([
        { author: "at", peer: "ap", shared: 1, average: 2, strength: 50 },
        { author: "ap", peer: "at", shared: 1, average: 2, strength: 50 },
        { author: "jt", peer: "ap", shared: 1, average: 2, strength: 50 },
        { author: "ap", peer: "jt", shared: 1, average: 2, strength: 50 },
      ])
    );
  });

  test("returns empty array when no authors share entities", () => {
    const isolated: Modification[] = [
      { entity: "A", rev: "1", author: "at", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
      { entity: "B", rev: "2", author: "jt", date: "2013-01-02", locAdded: 1, locDeleted: 0 },
    ];
    const result = communication(isolated, lowThresholds);
    expect(result).toEqual([]);
  });
});
