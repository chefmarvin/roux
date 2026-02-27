function csvField(value: unknown): string {
  const s = String(value ?? "");
  // Quote if contains comma, double-quote, or newline
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCSV(
  data: Record<string, unknown>[],
  emptyHeaders?: string[]
): string {
  const cols = data.length > 0 ? Object.keys(data[0]) : emptyHeaders;
  if (!cols) return "";
  const lines = [cols.join(",")];
  for (const row of data) {
    lines.push(cols.map((h) => csvField(row[h])).join(","));
  }
  return lines.join("\n") + "\n";
}
