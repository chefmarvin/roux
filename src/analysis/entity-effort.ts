import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy } from "../utils/dataset";

export function entityEffort(
  data: Modification[],
  _options: AnalysisOptions
): Record<string, unknown>[] {
  const byEntity = groupBy(data, "entity");
  const result: Record<string, unknown>[] = [];

  for (const [entity, mods] of byEntity) {
    // Group by author within entity, counting unique revisions
    const authorRevs = new Map<string, Set<string>>();
    for (const m of mods) {
      const revs = authorRevs.get(m.author) ?? new Set<string>();
      revs.add(m.rev);
      authorRevs.set(m.author, revs);
    }

    // total-revs = sum of all author-revs
    let totalRevs = 0;
    for (const revs of authorRevs.values()) {
      totalRevs += revs.size;
    }

    // Build rows for each author
    const entityRows: Record<string, unknown>[] = [];
    for (const [author, revs] of authorRevs) {
      entityRows.push({
        entity: entity as string,
        author,
        "author-revs": revs.size,
        "total-revs": totalRevs,
      });
    }

    // Sort by author-revs desc within entity
    entityRows.sort((a, b) => (b["author-revs"] as number) - (a["author-revs"] as number));
    result.push(...entityRows);
  }

  // Sort by entity asc (stable — preserves author-revs desc within entity)
  result.sort((a, b) => (a.entity as string).localeCompare(b.entity as string));

  return result;
}
