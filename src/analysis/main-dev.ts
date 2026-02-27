import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy } from "../utils/dataset";

/** Format ownership ratio to match code-maat's Clojure double formatting */
function formatOwnership(ratio: number): string {
  const rounded = Math.round(ratio * 100) / 100;
  const s = String(rounded);
  return s.includes(".") ? s : s + ".0";
}

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
      if (added >= bestAdded) {
        bestAdded = added;
        bestAuthor = author as string;
      }
    }

    const ownership = totalAdded > 0
      ? formatOwnership(bestAdded / totalAdded)
      : "0.0";
    result.push({
      entity: entity as string,
      "main-dev": bestAuthor,
      added: bestAdded,
      "total-added": totalAdded,
      ownership,
    });
  }

  result.sort((a, b) =>
    (a.entity as string).localeCompare(b.entity as string)
  );
  return result;
}
