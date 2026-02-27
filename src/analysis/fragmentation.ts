import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy, orderBy } from "../utils/dataset";

export function fragmentation(
  data: Modification[],
  _options: AnalysisOptions
): Record<string, unknown>[] {
  const byEntity = groupBy(data, "entity");
  const result: Record<string, unknown>[] = [];

  for (const [entity, mods] of byEntity) {
    // Count unique revisions per author
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

    // fractal = 1 - sum((author_revs / total_revs)^2)
    let sumSquares = 0;
    for (const revs of authorRevs.values()) {
      const fraction = revs.size / totalRevs;
      sumSquares += fraction * fraction;
    }
    const fractal = Math.round((1 - sumSquares) * 100) / 100;

    result.push({
      entity: entity as string,
      "fractal-value": fractal,
      "total-revs": totalRevs,
    });
  }

  return orderBy(result, "fractal-value", "desc");
}
