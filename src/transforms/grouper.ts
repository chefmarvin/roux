import type { Modification } from "../parsers/types";

export interface GroupSpec {
  pattern: RegExp;
  name: string;
}

export function parseGroupFile(text: string): GroupSpec[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [path, name] = line.split("=>").map((s) => s.trim());
      const normalized = path.replace(/^\/|\/$/g, "");
      return { pattern: new RegExp(`^${normalized}/`), name };
    });
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
