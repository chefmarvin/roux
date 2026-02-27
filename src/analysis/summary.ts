import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";

export function summary(
  data: Modification[],
  _options: AnalysisOptions
): Record<string, unknown>[] {
  const commits = new Set(data.map((m) => m.rev));
  const entities = new Set(data.map((m) => m.entity));
  const authors = new Set(data.map((m) => m.author));

  return [
    { statistic: "number-of-commits", value: commits.size },
    { statistic: "number-of-entities", value: entities.size },
    { statistic: "number-of-entities-changed", value: data.length },
    { statistic: "number-of-authors", value: authors.size },
  ];
}
