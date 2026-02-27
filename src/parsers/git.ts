import type { Modification } from "./types";

// [hash] author YYYY-MM-DD message
// The date is the FIRST occurrence of YYYY-MM-DD pattern after the "]"
const HEADER_RE = /^\[([a-f0-9]+)\]\s+(.+?)\s+(\d{4}-\d{2}-\d{2})\s+(.*)$/;
const NUMSTAT_RE = /^(\d+|-)\t(\d+|-)\t(.+)$/;

export function parseGitLog(text: string): Modification[] {
  const result: Modification[] = [];
  const lines = text.split("\n");

  let currentRev = "";
  let currentDate = "";
  let currentAuthor = "";
  let currentMessage = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(HEADER_RE);
    if (headerMatch) {
      currentRev = headerMatch[1];
      currentAuthor = headerMatch[2];
      currentDate = headerMatch[3];
      currentMessage = headerMatch[4];
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
        message: currentMessage,
      });
    }
  }

  return result;
}
