import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy } from "../utils/dataset";

export function refactoringMainDev(
  data: Modification[],
  _options: AnalysisOptions
): Record<string, unknown>[] {
  const byEntity = groupBy(data, "entity");
  const result: Record<string, unknown>[] = [];

  for (const [entity, mods] of byEntity) {
    const byAuthor = groupBy(mods, "author");
    let bestAuthor = "";
    let bestDeleted = 0;
    let totalDeleted = 0;

    for (const [author, authorMods] of byAuthor) {
      const deleted = authorMods.reduce(
        (sum, m) => sum + Math.max(0, m.locDeleted),
        0
      );
      totalDeleted += deleted;
      if (deleted > bestDeleted) {
        bestDeleted = deleted;
        bestAuthor = author as string;
      }
    }

    if (totalDeleted > 0) {
      result.push({
        entity: entity as string,
        "main-dev": bestAuthor,
        removed: bestDeleted,
        "total-removed": totalDeleted,
        ownership: Math.round((bestDeleted / totalDeleted) * 100) / 100,
      });
    }
  }

  result.sort((a, b) =>
    (a.entity as string).localeCompare(b.entity as string)
  );
  return result;
}
