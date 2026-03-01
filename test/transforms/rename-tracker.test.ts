import { describe, test, expect } from "@jest/globals";
import { buildRenameMap, applyRenameTracking } from "../../src/transforms/rename-tracker";
import type { Modification } from "../../src/parsers/types";

const mod = (entity: string, date: string, opts?: Partial<Modification>): Modification => ({
  entity,
  author: "alice",
  rev: "abc",
  date,
  locAdded: 10,
  locDeleted: 5,
  ...opts,
});

describe("buildRenameMap", () => {
  test("maps old path to new path", () => {
    const data = [mod("b.ts", "2024-02-01", { renamedFrom: "a.ts" })];
    const map = buildRenameMap(data);
    expect(map.get("a.ts")).toBe("b.ts");
  });

  test("resolves chains A→B→C", () => {
    const data = [
      mod("b.ts", "2024-01-01", { renamedFrom: "a.ts" }),
      mod("c.ts", "2024-02-01", { renamedFrom: "b.ts" }),
    ];
    const map = buildRenameMap(data);
    expect(map.get("a.ts")).toBe("c.ts");
    expect(map.get("b.ts")).toBe("c.ts");
  });

  test("handles circular renames without infinite loop", () => {
    const data = [
      mod("b.ts", "2024-01-01", { renamedFrom: "a.ts" }),
      mod("a.ts", "2024-02-01", { renamedFrom: "b.ts" }),
    ];
    const map = buildRenameMap(data);
    // Should resolve without hanging; exact result depends on order but must terminate
    expect(map.size).toBeGreaterThan(0);
  });

  test("returns empty map for no renames", () => {
    const data = [mod("a.ts", "2024-01-01"), mod("b.ts", "2024-02-01")];
    const map = buildRenameMap(data);
    expect(map.size).toBe(0);
  });
});

describe("applyRenameTracking", () => {
  test("returns original array reference when no renames exist", () => {
    const data = [mod("a.ts", "2024-01-01"), mod("b.ts", "2024-02-01")];
    const result = applyRenameTracking(data);
    expect(result).toBe(data);
  });

  test("rewrites old path to new path", () => {
    const data = [
      mod("a.ts", "2024-01-01"),
      mod("b.ts", "2024-02-01", { renamedFrom: "a.ts" }),
    ];
    const result = applyRenameTracking(data);
    expect(result[0].entity).toBe("b.ts");
    expect(result[1].entity).toBe("b.ts");
  });

  test("resolves chain renames across all history", () => {
    const data = [
      mod("a.ts", "2024-01-01"),
      mod("b.ts", "2024-02-01", { renamedFrom: "a.ts" }),
      mod("b.ts", "2024-03-01"),
      mod("c.ts", "2024-04-01", { renamedFrom: "b.ts" }),
    ];
    const result = applyRenameTracking(data);
    // All should point to c.ts
    expect(result.every((m) => m.entity === "c.ts")).toBe(true);
  });

  test("does not affect unrenamed files", () => {
    const data = [
      mod("x.ts", "2024-01-01"),
      mod("b.ts", "2024-02-01", { renamedFrom: "a.ts" }),
    ];
    const result = applyRenameTracking(data);
    expect(result[0].entity).toBe("x.ts");
  });

  test("preserves other fields", () => {
    const data = [
      mod("a.ts", "2024-01-01", { author: "bob", locAdded: 42, locDeleted: 7 }),
      mod("b.ts", "2024-02-01", { renamedFrom: "a.ts" }),
    ];
    const result = applyRenameTracking(data);
    expect(result[0].author).toBe("bob");
    expect(result[0].locAdded).toBe(42);
    expect(result[0].locDeleted).toBe(7);
    expect(result[0].date).toBe("2024-01-01");
  });
});
