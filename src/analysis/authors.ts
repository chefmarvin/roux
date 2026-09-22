import type { Modification } from "../parsers/types.js";
import type { AnalysisOptions } from "./types.js";
import { groupBy, orderBy } from "../utils/dataset.js";

export function authors(
  data: Modification[],
  options: AnalysisOptions
): Record<string, unknown>[] {
  const byEntity = groupBy(data, "entity");
  const result: Record<string, unknown>[] = [];

  // No min-revs filter here, matching code-maat: authors.clj/by-count takes
  // an options map and never reads it.
  for (const [entity, mods] of byEntity) {
    result.push({
      entity: entity as string,
      "n-authors": new Set(mods.map((m) => m.author)).size,
      "n-revs": mods.length,
    });
  }

  return orderBy(result, "n-authors", "desc");
}
