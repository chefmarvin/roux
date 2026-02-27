import { describe, test, expect } from "@jest/globals";
import { mainDevByRevs } from "../../src/analysis/main-dev-by-revs";
import { defaultOptions } from "../../src/analysis/types";
import type { Modification } from "../../src/parsers/types";

describe("main-dev-by-revs", () => {
  const data: Modification[] = [
    { entity: "A", rev: "1", author: "at", date: "2013-01-01", locAdded: 10, locDeleted: 1 },
    { entity: "A", rev: "2", author: "at", date: "2013-01-02", locAdded: 2, locDeleted: 5 },
    { entity: "A", rev: "1", author: "zt", date: "2013-01-01", locAdded: 7, locDeleted: 1 },
  ];

  test("picks author with most unique revisions as main developer", () => {
    const result = mainDevByRevs(data, defaultOptions);
    expect(result).toEqual([
      { entity: "A", "main-dev": "at", added: 2, "total-added": 3, ownership: "0.67" },
    ]);
  });

  test("counts unique revisions, not duplicates", () => {
    const dupeRevData: Modification[] = [
      { entity: "B", rev: "1", author: "at", date: "2013-01-01", locAdded: 10, locDeleted: 0 },
      { entity: "B", rev: "1", author: "at", date: "2013-01-01", locAdded: 5, locDeleted: 0 },
      { entity: "B", rev: "2", author: "xy", date: "2013-01-02", locAdded: 3, locDeleted: 0 },
    ];
    const result = mainDevByRevs(dupeRevData, defaultOptions);
    // at: 1 unique rev ("1"), xy: 1 unique rev ("2"), total: 2
    // Tie — last encountered wins (matches code-maat's reverse+sort-by)
    expect(result).toEqual([
      { entity: "B", "main-dev": "xy", added: 1, "total-added": 2, ownership: "0.5" },
    ]);
  });
});
