export function groupBy<T extends Record<string, unknown>>(
  data: T[],
  key: string
): Map<unknown, T[]> {
  const map = new Map<unknown, T[]>();
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

export function orderBy<T extends Record<string, unknown>>(
  data: T[],
  key: string,
  direction: "asc" | "desc" = "desc"
): T[] {
  const sorted = [...data];
  sorted.sort((a, b) => {
    const va = a[key] as number;
    const vb = b[key] as number;
    return direction === "desc" ? vb - va : va - vb;
  });
  return sorted;
}
