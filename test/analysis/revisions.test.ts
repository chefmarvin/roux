import { describe, test, expect } from "@jest/globals";
import { revisions } from "../../src/analysis/revisions";
import { vcs, lowThresholds } from "../fixtures/test-data";

describe("revisions", () => {
  test("sorts entities by number of revisions descending", () => {
    const result = revisions(vcs, lowThresholds);
    expect(result).toEqual([
      { entity: "A", nRevs: 3 },
      { entity: "B", nRevs: 1 },
    ]);
  });
});
