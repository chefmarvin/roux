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

  // Entries with message "-" are dash placeholders (format has no real messages)
  const dashEntries = data.filter((m) => m.message === "-");

  // If ALL entries have dash placeholder messages, the format doesn't support messages
  if (dashEntries.length > 0 && dashEntries.length === data.length) {
    throw new Error(
      "Cannot do a messages analysis without commit messages. " +
      "The input log format may not include messages."
    );
  }

  // Filter out dash placeholders before matching
  const withMessages = data.filter((m) => m.message && m.message !== "-");

  const regex = new RegExp(options.expressionToMatch);
  const byEntity = groupBy(withMessages, "entity");
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
