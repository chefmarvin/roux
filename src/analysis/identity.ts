import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";

export function identity(
  data: Modification[],
  _options: AnalysisOptions
): Record<string, unknown>[] {
  return data.map((m) => {
    const row: Record<string, unknown> = {
      author: m.author,
      entity: m.entity,
      rev: m.rev,
      date: m.date,
      locAdded: m.locAdded,
      locDeleted: m.locDeleted,
    };
    if (m.message !== undefined) {
      row.message = m.message;
    }
    return row;
  });
}
