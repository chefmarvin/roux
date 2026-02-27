import { describe, test, expect } from "bun:test";
import { authors } from "../../src/analysis/authors";
import { vcs, lowThresholds } from "../fixtures/test-data";

describe("authors", () => {
  test("sorts entities by max number of authors descending", () => {
    const result = authors(vcs, lowThresholds);
    expect(result).toEqual([
      { entity: "A", nAuthors: 2, nRevs: 3 },
      { entity: "B", nAuthors: 1, nRevs: 1 },
    ]);
  });
});
