import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy, orderBy } from "../utils/dataset";

export function authors(
  data: Modification[],
  options: AnalysisOptions
): Record<string, unknown>[] {
  const byEntity = groupBy(data, "entity");
  const result: Record<string, unknown>[] = [];

  for (const [entity, mods] of byEntity) {
    const uniqueAuthors = new Set(mods.map((m) => m.author));
    const uniqueRevs = new Set(mods.map((m) => m.rev));
    if (uniqueRevs.size >= options.minRevs) {
      result.push({
        entity: entity as string,
        nAuthors: uniqueAuthors.size,
        nRevs: uniqueRevs.size,
      });
    }
  }

  return orderBy(result, "nAuthors", "desc");
}
