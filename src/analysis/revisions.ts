import type { Modification } from "../parsers/types.js";
import type { AnalysisOptions } from "./types.js";
import { groupBy, orderBy } from "../utils/dataset.js";

export function revisions(
  data: Modification[],
  options: AnalysisOptions
): Record<string, unknown>[] {
  const byEntity = groupBy(data, "entity");
  const result: Record<string, unknown>[] = [];

  for (const [entity, mods] of byEntity) {
    const nRevs = mods.length;
    if (nRevs >= options.minRevs) {
      result.push({
        entity: entity as string,
        "n-revs": nRevs,
      });
    }
  }

  return orderBy(result, "n-revs", "desc");
}
