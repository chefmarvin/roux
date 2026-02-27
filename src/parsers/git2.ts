import type { Modification } from "./types";

const HEADER_RE = /^--([a-f0-9]+)--(\d{4}-\d{2}-\d{2})--(.+)$/;
const NUMSTAT_RE = /^(\d+|-)\t(\d+|-)\t(.+)$/;

export function parseGit2Log(text: string): Modification[] {
  const result: Modification[] = [];
  const lines = text.split("\n");

  let currentRev = "";
  let currentDate = "";
  let currentAuthor = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(HEADER_RE);
    if (headerMatch) {
      currentRev = headerMatch[1];
      currentDate = headerMatch[2];
      currentAuthor = headerMatch[3];
      continue;
    }

    const numstatMatch = trimmed.match(NUMSTAT_RE);
    if (numstatMatch && currentRev) {
      const added = numstatMatch[1];
      const deleted = numstatMatch[2];
      result.push({
        entity: numstatMatch[3],
        author: currentAuthor,
        rev: currentRev,
        date: currentDate,
        locAdded: added === "-" ? -1 : parseInt(added, 10),
        locDeleted: deleted === "-" ? -1 : parseInt(deleted, 10),
      });
    }
  }

  return result;
}
