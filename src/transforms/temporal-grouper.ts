import type { Modification } from "../parsers/types";

export function applyTemporalGrouping(
  data: Modification[],
  periodDays: number,
): Modification[] {
  if (data.length === 0) return [];

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const startDate = new Date(sorted[0].date);
  const endDate = new Date(sorted[sorted.length - 1].date);

  const byDate = new Map<string, Modification[]>();
  for (const mod of sorted) {
    const existing = byDate.get(mod.date) ?? [];
    existing.push(mod);
    byDate.set(mod.date, existing);
  }

  const result: Modification[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const windowEnd = new Date(current);
    windowEnd.setDate(windowEnd.getDate() + periodDays - 1);
    const latestDate = windowEnd > endDate ? endDate : windowEnd;

    const entities = new Set<string>();
    const windowMods: Modification[] = [];
    const d = new Date(current);
    while (d <= latestDate && d <= endDate) {
      const dateStr = d.toISOString().slice(0, 10);
      const mods = byDate.get(dateStr) ?? [];
      for (const mod of mods) {
        if (!entities.has(mod.entity)) {
          entities.add(mod.entity);
          windowMods.push({
            ...mod,
            rev: latestDate.toISOString().slice(0, 10),
          });
        }
      }
      d.setDate(d.getDate() + 1);
    }
    if (windowMods.length > 0) result.push(...windowMods);
    current.setDate(current.getDate() + 1);
  }

  return result;
}
