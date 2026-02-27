import { readFileSync } from "fs";
import { extname } from "path";
import type { Modification } from "../parsers/types";

export function parseTeamCSV(csvText: string): Map<string, string> {
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

export const parseTeamMap = parseTeamCSV;

export function parseTeamJSON(text: string): Map<string, string> {
  const obj = JSON.parse(text) as Record<string, string>;
  return new Map(Object.entries(obj));
}

export function parseTeamMarkdown(text: string): Map<string, string> {
  const map = new Map<string, string>();
  const dataRows = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !line.includes("---"))
    .slice(1); // skip header row
  for (const row of dataRows) {
    const cols = row.split("|").map((c) => c.trim()).filter(Boolean);
    if (cols.length >= 2) {
      map.set(cols[0], cols[1]);
    }
  }
  return map;
}

export function parseTeamConfig(filePath: string): Map<string, string> {
  const text = readFileSync(filePath, "utf-8");
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".json": return parseTeamJSON(text);
    case ".md":   return parseTeamMarkdown(text);
    default:      return parseTeamCSV(text);
  }
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
