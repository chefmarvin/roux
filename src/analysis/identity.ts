import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";

export function identity(
  data: Modification[],
  _options: AnalysisOptions
): Record<string, unknown>[] {
  return data.map((m) => ({
    author: m.author,
    rev: m.rev,
    date: m.date,
    entity: m.entity,
    message: m.message ?? "-",
    "loc-added": m.locAdded < 0 ? "-" : m.locAdded,
    "loc-deleted": m.locDeleted < 0 ? "-" : m.locDeleted,
  }));
}
