import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy, orderBy } from "../utils/dataset";

export function messages(
  data: Modification[],
  options: AnalysisOptions
): Record<string, unknown>[] {
  if (!options.expressionToMatch) {
    throw new Error(
      "Messages analysis requires --expression-to-match (-e) option"
    );
  }

  const regex = new RegExp(options.expressionToMatch);
  const byEntity = groupBy(data, "entity");
  const result: Record<string, unknown>[] = [];

  for (const [entity, mods] of byEntity) {
    const matches = mods.filter((m) => m.message && regex.test(m.message))
      .length;
    if (matches > 0) {
      result.push({ entity: entity as string, matches });
    }
  }

  return orderBy(result, "matches", "desc");
}
