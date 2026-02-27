import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy } from "../utils/dataset";

export function mainDevByRevs(
  data: Modification[],
  _options: AnalysisOptions
): Record<string, unknown>[] {
  const byEntity = groupBy(data, "entity");
  const result: Record<string, unknown>[] = [];

  for (const [entity, mods] of byEntity) {
    const byAuthor = groupBy(mods, "author");
    let bestAuthor = "";
    let bestRevs = 0;
    let totalRevs = 0;

    for (const [author, authorMods] of byAuthor) {
      const uniqueRevs = new Set(authorMods.map((m) => m.rev)).size;
      totalRevs += uniqueRevs;
      if (uniqueRevs > bestRevs) {
        bestRevs = uniqueRevs;
        bestAuthor = author as string;
      }
    }

    if (totalRevs > 0) {
      result.push({
        entity: entity as string,
        "main-dev": bestAuthor,
        added: bestRevs,
        "total-added": totalRevs,
        ownership: Math.round((bestRevs / totalRevs) * 100) / 100,
      });
    }
  }

  result.sort((a, b) =>
    (a.entity as string).localeCompare(b.entity as string)
  );
  return result;
}
