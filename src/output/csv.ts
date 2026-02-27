export function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const lines = [headers.join(",")];
  for (const row of data) {
    lines.push(headers.map((h) => String(row[h] ?? "")).join(","));
  }
  return lines.join("\n") + "\n";
}
