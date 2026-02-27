import { readFileSync } from "fs";
import { extname } from "path";
import type { Modification } from "../parsers/types";

export interface GroupSpec {
  pattern: RegExp;
  name: string;
}

function toGroupSpec(path: string, name: string): GroupSpec {
  if (path.startsWith("^") && path.endsWith("$")) {
    return { pattern: new RegExp(path), name };
  }
  const normalized = path.replace(/^\/|\/$/g, "");
  return { pattern: new RegExp(`^${normalized}/`), name };
}

export function parseGroupText(text: string): GroupSpec[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [path, name] = line.split("=>").map((s) => s.trim());
      return toGroupSpec(path, name);
    });
}

export const parseGroupFile = parseGroupText;

export function parseGroupJSON(text: string): GroupSpec[] {
  const obj = JSON.parse(text) as Record<string, string>;
  return Object.entries(obj).map(([path, name]) => toGroupSpec(path, name));
}

export function parseGroupMarkdown(text: string): GroupSpec[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !line.includes("---"))
    .slice(1) // skip header row
    .map((line) => {
      const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
      return toGroupSpec(cols[0], cols[1]);
    });
}

export function parseGroupConfig(filePath: string): GroupSpec[] {
  const text = readFileSync(filePath, "utf-8");
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".json": return parseGroupJSON(text);
    case ".md":   return parseGroupMarkdown(text);
    default:      return parseGroupText(text);
  }
}

export function applyGrouping(
  data: Modification[],
  specs: GroupSpec[],
): Modification[] {
  const result: Modification[] = [];
  for (const mod of data) {
    for (const spec of specs) {
      if (spec.pattern.test(mod.entity)) {
        result.push({ ...mod, entity: spec.name });
        break;
      }
    }
  }
  return result;
}
