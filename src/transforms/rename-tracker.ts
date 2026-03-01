import type { Modification } from "../parsers/types";

/**
 * Build a map from old paths to their final (most recent) path,
 * resolving chains like A→B→C so that A and B both map to C.
 */
export function buildRenameMap(data: Modification[]): Map<string, string> {
  // Collect rename pairs in chronological order (oldest first)
  const sorted = [...data]
    .filter((m) => m.renamedFrom)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Forward map: oldPath → immediate newPath
  const forward = new Map<string, string>();
  for (const m of sorted) {
    forward.set(m.renamedFrom!, m.entity);
  }

  // Resolve chains: follow forward links to find the final path
  const resolved = new Map<string, string>();
  for (const oldPath of forward.keys()) {
    let current = oldPath;
    const visited = new Set<string>();
    while (forward.has(current) && !visited.has(current)) {
      visited.add(current);
      current = forward.get(current)!;
    }
    resolved.set(oldPath, current);
  }

  return resolved;
}

/**
 * Rewrite all Modification entities so that renamed files use their
 * most recent path. Returns the original array reference if no renames exist.
 */
export function applyRenameTracking(data: Modification[]): Modification[] {
  const renameMap = buildRenameMap(data);
  if (renameMap.size === 0) return data;

  return data.map((m) => {
    const finalPath = renameMap.get(m.entity);
    if (finalPath && finalPath !== m.entity) {
      return { ...m, entity: finalPath };
    }
    return m;
  });
}
