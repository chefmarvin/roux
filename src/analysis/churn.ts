import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy, orderBy } from "../utils/dataset";

/** Normalize binary (-1) to 0 for churn calculations */
function loc(value: number): number {
  return value < 0 ? 0 : value;
}

export function absoluteChurn(
  data: Modification[],
  _options: AnalysisOptions
): Record<string, unknown>[] {
  const byDate = groupBy(data, "date");
  const result: Record<string, unknown>[] = [];

  for (const [date, mods] of byDate) {
    const commits = new Set(mods.map((m) => m.rev)).size;
    const added = mods.reduce((sum, m) => sum + loc(m.locAdded), 0);
    const deleted = mods.reduce((sum, m) => sum + loc(m.locDeleted), 0);
    result.push({ date: date as string, added, deleted, commits });
  }

  return result.sort((a, b) =>
    (a.date as string).localeCompare(b.date as string)
  );
}

export function churnByEntity(
  data: Modification[],
  _options: AnalysisOptions
): Record<string, unknown>[] {
  const byEntity = groupBy(data, "entity");
  const result: Record<string, unknown>[] = [];

  for (const [entity, mods] of byEntity) {
    const commits = new Set(mods.map((m) => m.rev)).size;
    const added = mods.reduce((sum, m) => sum + loc(m.locAdded), 0);
    const deleted = mods.reduce((sum, m) => sum + loc(m.locDeleted), 0);
    result.push({ entity: entity as string, added, deleted, commits });
  }

  return orderBy(result, "added", "desc");
}

export function churnByAuthor(
  data: Modification[],
  _options: AnalysisOptions
): Record<string, unknown>[] {
  const byAuthor = groupBy(data, "author");
  const result: Record<string, unknown>[] = [];

  for (const [author, mods] of byAuthor) {
    const commits = new Set(mods.map((m) => m.rev)).size;
    const added = mods.reduce((sum, m) => sum + loc(m.locAdded), 0);
    const deleted = mods.reduce((sum, m) => sum + loc(m.locDeleted), 0);
    result.push({ author: author as string, added, deleted, commits });
  }

  return orderBy(result, "added", "desc");
}
