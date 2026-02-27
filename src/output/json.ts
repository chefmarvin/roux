export function toJSON(data: Record<string, unknown>[]): string {
  return JSON.stringify(data, null, 2) + "\n";
}
