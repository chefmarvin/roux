import { describe, test, expect } from "@jest/globals";
import { revisions } from "../../src/analysis/revisions";
import { vcs, lowThresholds } from "../fixtures/test-data";

describe("revisions", () => {
  test("sorts entities by number of revisions descending", () => {
    const result = revisions(vcs, lowThresholds);
    expect(result).toEqual([
      { entity: "A", "n-revs": 3 },
      { entity: "B", "n-revs": 1 },
    ]);
  });

  test("reports every entity regardless of the min-revs threshold", () => {
    // code-maat does not apply min-revs here: entities.clj/by-revision takes
    // an options map and never reads it. The threshold exists to denoise
    // coupling, not to truncate a descriptive listing.
    const result = revisions(vcs, { ...lowThresholds, minRevs: 99 });

    expect(result).toEqual([
      { entity: "A", "n-revs": 3 },
      { entity: "B", "n-revs": 1 },
    ]);
  });
});
