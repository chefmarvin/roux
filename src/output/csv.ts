export function toCSV(
  data: Record<string, unknown>[],
  emptyHeaders?: string[]
): string {
  const cols = data.length > 0 ? Object.keys(data[0]) : emptyHeaders;
  if (!cols) return "";
  const lines = [cols.join(",")];
  for (const row of data) {
    lines.push(cols.map((h) => String(row[h] ?? "")).join(","));
  }
  return lines.join("\n") + "\n";
}
