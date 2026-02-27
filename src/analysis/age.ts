import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy, orderBy } from "../utils/dataset";

/** Parse "YYYY-MM-DD" into { year, month, day } without timezone issues */
function parseYMD(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { year: y, month: m, day: d };
}

/** Calculate months between two dates, matching java.time.Period semantics */
function monthsBetween(
  from: { year: number; month: number; day: number },
  to: { year: number; month: number; day: number }
): number {
  let months = (to.year - from.year) * 12 + (to.month - from.month);
  if (to.day < from.day) {
    months--;
  }
  return months;
}

export function age(
  data: Modification[],
  options: AnalysisOptions
): Record<string, unknown>[] {
  const now = options.ageTimeNow
    ? parseYMD(options.ageTimeNow)
    : (() => {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
      })();

  const byEntity = groupBy(data, "entity");
  const result: Record<string, unknown>[] = [];

  for (const [entity, mods] of byEntity) {
    const latestDate = mods.reduce((latest, m) =>
      m.date > latest ? m.date : latest, mods[0].date);
    const from = parseYMD(latestDate);
    const months = monthsBetween(from, now);
    result.push({ entity: entity as string, "age-months": months });
  }

  return orderBy(result, "age-months", "asc");
}
