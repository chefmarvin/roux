import type { Modification } from "../parsers/types.js";
import type { AnalysisOptions } from "./types.js";
import { groupBy, orderBy } from "../utils/dataset.js";

export function revisions(
  data: Modification[],
  options: AnalysisOptions
): Record<string, unknown>[] {
  const byEntity = groupBy(data, "entity");
  const result: Record<string, unknown>[] = [];

  // No min-revs filter here: code-maat's entities.clj/by-revision accepts an
  // options map and never reads it. The threshold is there to denoise the
  // coupling analyses, not to truncate a descriptive listing.
  for (const [entity, mods] of byEntity) {
    result.push({
      entity: entity as string,
      "n-revs": mods.length,
    });
  }

  return orderBy(result, "n-revs", "desc");
}
