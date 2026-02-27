export function groupBy<T>(
  data: T[],
  key: keyof T & string
): Map<T[keyof T], T[]> {
  const map = new Map<T[keyof T], T[]>();
  for (const item of data) {
    const k = item[key];
    const group = map.get(k);
    if (group) {
      group.push(item);
    } else {
      map.set(k, [item]);
    }
  }
  return map;
}

export function orderBy<T>(
  data: T[],
  key: keyof T & string,
  direction: "asc" | "desc" = "desc"
): T[] {
  const sorted = [...data];
  sorted.sort((a, b) => {
    const va = a[key] as number;
    const vb = b[key] as number;
    const cmp = direction === "desc" ? vb - va : va - vb;
    if (cmp !== 0) return cmp;
    // Stable tie-break: sort alphabetically by first string field
    const strKey = Object.keys(a as Record<string, unknown>).find(
      (k) => typeof (a as Record<string, unknown>)[k] === "string"
    );
    if (strKey) {
      const sa = (a as Record<string, unknown>)[strKey] as string;
      const sb = (b as Record<string, unknown>)[strKey] as string;
      return sa.localeCompare(sb);
    }
    return 0;
  });
  return sorted;
}
