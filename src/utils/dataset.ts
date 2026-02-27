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
    return direction === "desc" ? vb - va : va - vb;
  });
  return sorted;
}
