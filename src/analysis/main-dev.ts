import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy } from "../utils/dataset";

export function mainDev(
  data: Modification[],
  _options: AnalysisOptions
): Record<string, unknown>[] {
  const byEntity = groupBy(data, "entity");
  const result: Record<string, unknown>[] = [];

  for (const [entity, mods] of byEntity) {
    const byAuthor = groupBy(mods, "author");
    let bestAuthor = "";
    let bestAdded = 0;
    let totalAdded = 0;

    for (const [author, authorMods] of byAuthor) {
      const added = authorMods.reduce(
        (sum, m) => sum + Math.max(0, m.locAdded),
        0
      );
      totalAdded += added;
      if (added > bestAdded) {
        bestAdded = added;
        bestAuthor = author as string;
      }
    }

    if (totalAdded > 0) {
      result.push({
        entity: entity as string,
        "main-dev": bestAuthor,
        added: bestAdded,
        "total-added": totalAdded,
        ownership: Math.round((bestAdded / totalAdded) * 100) / 100,
      });
    }
  }

  result.sort((a, b) =>
    (a.entity as string).localeCompare(b.entity as string)
  );
  return result;
}
