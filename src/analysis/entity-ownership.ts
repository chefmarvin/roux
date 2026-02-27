import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy } from "../utils/dataset";

/** Normalize binary (-1) to 0 */
function loc(value: number): number {
  return value < 0 ? 0 : value;
}

export function entityOwnership(
  data: Modification[],
  _options: AnalysisOptions
): Record<string, unknown>[] {
  const byEntity = groupBy(data, "entity");
  const result: Record<string, unknown>[] = [];

  for (const [entity, mods] of byEntity) {
    const byAuthor = new Map<string, { added: number; deleted: number }>();
    for (const m of mods) {
      const stats = byAuthor.get(m.author) ?? { added: 0, deleted: 0 };
      stats.added += loc(m.locAdded);
      stats.deleted += loc(m.locDeleted);
      byAuthor.set(m.author, stats);
    }
    for (const [author, stats] of byAuthor) {
      result.push({
        entity: entity as string,
        author,
        added: stats.added,
        deleted: stats.deleted,
      });
    }
  }

  // Sort by entity asc, then by added desc within entity
  result.sort((a, b) => {
    const entityCmp = (a.entity as string).localeCompare(b.entity as string);
    if (entityCmp !== 0) return entityCmp;
    return (b.added as number) - (a.added as number);
  });

  return result;
}
