import { describe, test, expect } from "@jest/globals";
import { authors } from "../../src/analysis/authors";
import { vcs, lowThresholds } from "../fixtures/test-data";

describe("authors", () => {
  test("sorts entities by max number of authors descending", () => {
    const result = authors(vcs, lowThresholds);
    expect(result).toEqual([
      { entity: "A", "n-authors": 2, "n-revs": 3 },
      { entity: "B", "n-authors": 1, "n-revs": 1 },
    ]);
  });

  test("reports every entity regardless of the min-revs threshold", () => {
    // Same as revisions: authors.clj/by-count ignores the options map.
    const withThreshold = authors(vcs, { ...lowThresholds, minRevs: 99 });
    const withoutThreshold = authors(vcs, lowThresholds);

    expect(withThreshold).toEqual(withoutThreshold);
    expect(withThreshold.length).toBeGreaterThan(0);
  });
});
