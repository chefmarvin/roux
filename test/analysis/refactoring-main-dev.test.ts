import { describe, test, expect } from "@jest/globals";
import { refactoringMainDev } from "../../src/analysis/refactoring-main-dev";
import { defaultOptions } from "../../src/analysis/types";
import type { Modification } from "../../src/parsers/types";

describe("refactoring-main-dev", () => {
  const data: Modification[] = [
    { entity: "A", rev: "1", author: "at", date: "2013-01-01", locAdded: 10, locDeleted: 1 },
    { entity: "A", rev: "2", author: "at", date: "2013-01-02", locAdded: 2, locDeleted: 5 },
    { entity: "A", rev: "1", author: "xy", date: "2013-01-01", locAdded: 7, locDeleted: 1 },
    { entity: "A", rev: "2", author: "xy", date: "2013-01-02", locAdded: 8, locDeleted: 2 },
  ];

  test("picks author with most lines deleted as main refactorer", () => {
    const result = refactoringMainDev(data, defaultOptions);
    expect(result).toEqual([
      { entity: "A", "main-dev": "at", removed: 6, "total-removed": 9, ownership: 0.67 },
    ]);
  });

  test("normalizes binary locDeleted of -1 to 0", () => {
    const binaryData: Modification[] = [
      { entity: "B", rev: "1", author: "at", date: "2013-01-01", locAdded: 0, locDeleted: -1 },
      { entity: "B", rev: "2", author: "xy", date: "2013-01-02", locAdded: 0, locDeleted: 8 },
    ];
    const result = refactoringMainDev(binaryData, defaultOptions);
    expect(result).toEqual([
      { entity: "B", "main-dev": "xy", removed: 8, "total-removed": 8, ownership: 1.0 },
    ]);
  });
});
