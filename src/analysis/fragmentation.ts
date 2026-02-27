import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy, orderBy } from "../utils/dataset";

/**
 * Format to 2 significant figures as a string, matching code-maat's
 * ratio->centi-float-precision. Uses toPrecision(2) for non-zero values,
 * which produces strings like "0.51", "0.091", "0.0050".
 * For zero, returns "0.0" to match Clojure's (double 0) formatting.
 */
function formatPrecision2(v: number): string {
  if (v === 0) return "0.0";
  const s = v.toPrecision(2);
  // toPrecision may return scientific notation for very small numbers
  return String(parseFloat(s));
}

export function fragmentation(
  data: Modification[],
  _options: AnalysisOptions
): Record<string, unknown>[] {
  const byEntity = groupBy(data, "entity");
  const intermediate: { entity: string; fractal: number; totalRevs: number }[] = [];

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
    // Use high-precision intermediate to avoid FP accumulation errors
    const fractal = 1 - parseFloat(sumSquares.toPrecision(10));

    intermediate.push({
      entity: entity as string,
      fractal,
      totalRevs,
    });
  }

  // Sort by fractal value descending (numerically), then by totalRevs descending
  intermediate.sort((a, b) => b.fractal - a.fractal || b.totalRevs - a.totalRevs);

  return intermediate.map((r) => ({
    entity: r.entity,
    "fractal-value": formatPrecision2(r.fractal),
    "total-revs": r.totalRevs,
  }));
}
