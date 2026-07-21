function escapeCsvValue(value: unknown) {
  const stringValue = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: Array<keyof T>) {
  const header = columns.map(String).join(",");
  const body = rows
    .map((row) => columns.map((column) => escapeCsvValue(row[column])).join(","))
    .join("\n");

  return [header, body].filter(Boolean).join("\n");
}
