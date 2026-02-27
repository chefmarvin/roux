import type { Modification } from "./types";

const DELIM = "--";
const NUMSTAT_RE = /^(\d+|-)\t(\d+|-)\t(.+)$/;

function parseHeader(line: string): { rev: string; date: string; author: string; message?: string } | null {
  // Format: --<rev>--<date>--<author>[--<message>]
  // We strip the leading "--" then split on "--" with a limit of 4 segments
  if (!line.startsWith(DELIM)) return null;
  const rest = line.slice(2); // strip leading "--"
  // Split into at most 4 parts: rev, date, author, message(optional)
  // But message may contain "--", so we split carefully
  const i1 = rest.indexOf(DELIM);
  if (i1 === -1) return null;
  const rev = rest.slice(0, i1);
  if (!/^[a-f0-9]+$/.test(rev)) return null;

  const i2 = rest.indexOf(DELIM, i1 + 2);
  if (i2 === -1) return null;
  const date = rest.slice(i1 + 2, i2);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const afterDate = rest.slice(i2 + 2);
  // Check if there's a message (next "--" after author)
  const i3 = afterDate.indexOf(DELIM);
  if (i3 === -1) {
    return { rev, date, author: afterDate };
  }
  const author = afterDate.slice(0, i3);
  const message = afterDate.slice(i3 + 2);
  return { rev, date, author, message: message || undefined };
}

export function parseGit2Log(text: string): Modification[] {
  const result: Modification[] = [];
  const lines = text.split("\n");

  let currentRev = "";
  let currentDate = "";
  let currentAuthor = "";
  let currentMessage: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const header = parseHeader(trimmed);
    if (header) {
      currentRev = header.rev;
      currentDate = header.date;
      currentAuthor = header.author;
      currentMessage = header.message;
      continue;
    }

    const numstatMatch = trimmed.match(NUMSTAT_RE);
    if (numstatMatch && currentRev) {
      const added = numstatMatch[1];
      const deleted = numstatMatch[2];
      const mod: Modification = {
        entity: numstatMatch[3],
        author: currentAuthor,
        rev: currentRev,
        date: currentDate,
        locAdded: added === "-" ? -1 : parseInt(added, 10),
        locDeleted: deleted === "-" ? -1 : parseInt(deleted, 10),
      };
      if (currentMessage !== undefined) {
        mod.message = currentMessage;
      }
      result.push(mod);
    }
  }

  return result;
}
