import { describe, test, expect } from "@jest/globals";
import { applyTemporalGrouping } from "../../src/transforms/temporal-grouper";
import type { Modification } from "../../src/parsers/types";

const mod = (entity: string, date: string): Modification => ({
  entity,
  author: "alice",
  rev: "abc",
  date,
  locAdded: 10,
  locDeleted: 5,
});

describe("applyTemporalGrouping", () => {
  test("returns empty for empty input", () => {
    expect(applyTemporalGrouping([], 7)).toEqual([]);
  });

  test("groups modifications within sliding windows", () => {
    const data = [
      mod("A", "2024-01-01"),
      mod("B", "2024-01-02"),
      mod("A", "2024-01-03"),
    ];
    const result = applyTemporalGrouping(data, 3);
    // With a 3-day sliding window starting at 2024-01-01,
    // the first window covers 01-01 through 01-03
    expect(result.length).toBeGreaterThan(0);
    // All results should have rev set to window end dates
    for (const r of result) {
      expect(r.rev).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test("deduplicates entities within windows", () => {
    const data = [
      mod("A", "2024-01-01"),
      mod("A", "2024-01-02"),
    ];
    // With period=3, the window starting at 01-01 covers 01-01 through 01-03
    // Entity A appears on both days but should only appear once per window
    const result = applyTemporalGrouping(data, 3);
    // Check the first window (starting 01-01): should have A only once
    const firstWindowRevs = result.filter(
      (r) => r.rev === "2024-01-03",
    );
    const entities = firstWindowRevs.map((r) => r.entity);
    // Within a single window, A should appear at most once
    const uniqueInWindow = new Set(entities);
    expect(uniqueInWindow.size).toBe(entities.length);
  });
});
