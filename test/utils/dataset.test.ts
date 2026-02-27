import { describe, test, expect } from "bun:test";
import { groupBy, orderBy } from "../../src/utils/dataset";

describe("groupBy", () => {
  test("groups records by key", () => {
    const data = [
      { name: "a", v: 1 },
      { name: "b", v: 2 },
      { name: "a", v: 3 },
    ];
    const result = groupBy(data, "name");
    expect(result.get("a")).toEqual([
      { name: "a", v: 1 },
      { name: "a", v: 3 },
    ]);
    expect(result.get("b")).toEqual([{ name: "b", v: 2 }]);
  });
});

describe("orderBy", () => {
  test("sorts descending by numeric field", () => {
    const data = [
      { name: "a", v: 1 },
      { name: "b", v: 3 },
      { name: "c", v: 2 },
    ];
    expect(orderBy(data, "v", "desc")).toEqual([
      { name: "b", v: 3 },
      { name: "c", v: 2 },
      { name: "a", v: 1 },
    ]);
  });

  test("sorts ascending by numeric field", () => {
    const data = [
      { name: "b", v: 3 },
      { name: "a", v: 1 },
    ];
    expect(orderBy(data, "v", "asc")).toEqual([
      { name: "a", v: 1 },
      { name: "b", v: 3 },
    ]);
  });
});
