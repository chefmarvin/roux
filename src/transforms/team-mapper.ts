import type { Modification } from "../parsers/types";

export function parseTeamMap(csvText: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of csvText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("author")) continue;
    const commaIdx = trimmed.indexOf(",");
    if (commaIdx > 0) {
      map.set(
        trimmed.slice(0, commaIdx).trim(),
        trimmed.slice(commaIdx + 1).trim(),
      );
    }
  }
  return map;
}

export function applyTeamMapping(
  data: Modification[],
  teamMap: Map<string, string>,
): Modification[] {
  return data.map((mod) => {
    const team = teamMap.get(mod.author);
    return team ? { ...mod, author: team } : mod;
  });
}
