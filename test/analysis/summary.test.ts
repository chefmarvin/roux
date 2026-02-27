import { describe, test, expect } from "@jest/globals";
import { summary } from "../../src/analysis/summary";
import { vcs, lowThresholds } from "../fixtures/test-data";

describe("summary", () => {
  test("returns overview statistics", () => {
    const result = summary(vcs, lowThresholds);
    expect(result).toEqual([
      { statistic: "number-of-commits", value: 3 },
      { statistic: "number-of-entities", value: 2 },
      { statistic: "number-of-entities-changed", value: 4 },
      { statistic: "number-of-authors", value: 2 },
    ]);
  });
});
