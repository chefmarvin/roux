import { describe, test, expect } from "@jest/globals";
import { mainDev } from "../../src/analysis/main-dev";
import { defaultOptions } from "../../src/analysis/types";
import type { Modification } from "../../src/parsers/types";

describe("main-dev", () => {
  const data: Modification[] = [
    { entity: "A", rev: "1", author: "at", date: "2013-01-01", locAdded: 10, locDeleted: 1 },
    { entity: "A", rev: "2", author: "at", date: "2013-01-02", locAdded: 2, locDeleted: 5 },
    { entity: "A", rev: "1", author: "xy", date: "2013-01-01", locAdded: 7, locDeleted: 1 },
    { entity: "A", rev: "2", author: "xy", date: "2013-01-02", locAdded: 8, locDeleted: 2 },
  ];

  test("picks author with most lines added as main developer", () => {
    const result = mainDev(data, defaultOptions);
    expect(result).toEqual([
      { entity: "A", "main-dev": "xy", added: 15, "total-added": 27, ownership: "0.56" },
    ]);
  });

  test("normalizes binary locAdded of -1 to 0", () => {
    const binaryData: Modification[] = [
      { entity: "B", rev: "1", author: "at", date: "2013-01-01", locAdded: -1, locDeleted: -1 },
      { entity: "B", rev: "2", author: "xy", date: "2013-01-02", locAdded: 5, locDeleted: 0 },
    ];
    const result = mainDev(binaryData, defaultOptions);
    expect(result).toEqual([
      { entity: "B", "main-dev": "xy", added: 5, "total-added": 5, ownership: "1.0" },
    ]);
  });

  test("sorts results by entity ascending", () => {
    const multiEntity: Modification[] = [
      { entity: "Z", rev: "1", author: "at", date: "2013-01-01", locAdded: 10, locDeleted: 0 },
      { entity: "A", rev: "1", author: "at", date: "2013-01-01", locAdded: 5, locDeleted: 0 },
    ];
    const result = mainDev(multiEntity, defaultOptions);
    expect(result[0].entity).toBe("A");
    expect(result[1].entity).toBe("Z");
  });
});
