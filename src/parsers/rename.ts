/**
 * Parse git numstat rename path formats into old/new path pairs.
 *
 * Supported formats:
 *   prefix/{old => new}/suffix   — renamed within a directory
 *   {old => new}/suffix          — no prefix
 *   prefix/{old => new}          — no suffix
 *   prefix/{ => new}/suffix      — moved into subdirectory
 *   prefix/{old => }/suffix      — moved out of subdirectory
 *   old => new                   — full path rename
 */

const BRACE_RE = /^(.*?)\{(.*?) => (.*?)\}(.*)$/;
const ARROW_RE = /^(.+) => (.+)$/;

function normalizePath(p: string): string {
  // Collapse consecutive slashes and strip leading/trailing slashes
  return p.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
}

export function parseRenamePath(filepath: string): { oldPath: string; newPath: string } | null {
  const braceMatch = filepath.match(BRACE_RE);
  if (braceMatch) {
    const prefix = braceMatch[1];
    const oldPart = braceMatch[2];
    const newPart = braceMatch[3];
    const suffix = braceMatch[4];
    return {
      oldPath: normalizePath(prefix + oldPart + suffix),
      newPath: normalizePath(prefix + newPart + suffix),
    };
  }

  const arrowMatch = filepath.match(ARROW_RE);
  if (arrowMatch) {
    return {
      oldPath: normalizePath(arrowMatch[1]),
      newPath: normalizePath(arrowMatch[2]),
    };
  }

  return null;
}
