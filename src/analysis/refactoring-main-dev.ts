import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy } from "../utils/dataset";

function formatOwnership(ratio: number): string {
  const rounded = Math.round(ratio * 100) / 100;
  const s = String(rounded);
  return s.includes(".") ? s : s + ".0";
}

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
      if (deleted >= bestDeleted) {
        bestDeleted = deleted;
        bestAuthor = author as string;
      }
    }

    const ownership = totalDeleted > 0
      ? formatOwnership(bestDeleted / totalDeleted)
      : "0.0";
    result.push({
      entity: entity as string,
      "main-dev": bestAuthor,
      removed: bestDeleted,
      "total-removed": totalDeleted,
      ownership,
    });
  }

  result.sort((a, b) =>
    (a.entity as string).localeCompare(b.entity as string)
  );
  return result;
}
