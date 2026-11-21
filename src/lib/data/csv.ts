/**
 * One row of a CSV file (the format spreadsheets export), with the file line it starts on.
 * Example: the first row under the header is { line: 2, cells: ["walmart-dover", "Walmart"] }.
 */
export type CsvRow = { line: number; cells: string[] };

/**
 * Splits CSV text into rows of cells, remembering which line each row starts on so errors can point to it.
 * Handles quoted cells that contain commas, like "36 Jerome Dr, Dover, DE", and doubled quotes inside them.
 * Example: 'a,"b, c"\n1,2' → [{ line: 1, cells: ["a", "b, c"] }, { line: 2, cells: ["1", "2"] }]. Blank lines are skipped.
 */
export function parseCsv(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let rowStart = 1;

  const endRow = () => {
    cells.push(cell);
    if (cells.some((c) => c.trim() !== "")) rows.push({ line: rowStart, cells });
    cells = [];
    cell = "";
  };

  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "\n") line++;
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cell);
      cell = "";
    } else if (ch === "\n") {
      endRow();
      rowStart = line;
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || cells.length > 0) endRow();
  return rows;
}

/** A CSV data row as a column-name → value lookup, plus the row number a spreadsheet would show for it. */
export type CsvRecord = { rowNumber: number; values: Record<string, string> };

/**
 * Reads CSV text into records keyed by the header names, and lists any required columns that are missing.
 * Example: "store_id,name\nwalmart-dover,Walmart" → one record { store_id: "walmart-dover", name: "Walmart" } at row 2.
 */
export function readCsvRecords(
  text: string,
  requiredColumns: readonly string[],
): { records: CsvRecord[]; missingColumns: string[] } {
  const [header, ...dataRows] = parseCsv(text);
  const columns = (header?.cells ?? []).map((h) => h.trim());
  const missingColumns = requiredColumns.filter((c) => !columns.includes(c));
  const records = dataRows.map((row) => {
    const values: Record<string, string> = {};
    columns.forEach((col, idx) => (values[col] = (row.cells[idx] ?? "").trim()));
    return { rowNumber: row.line, values };
  });
  return { records, missingColumns };
}
