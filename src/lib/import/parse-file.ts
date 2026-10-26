/**
 * Secure spreadsheet parsing. Files are parsed in memory (never written to disk), formulas are
 * never evaluated (cached results only), and size / row / column limits are enforced.
 *  .csv  → PapaParse
 *  .xlsx → ExcelJS (after a zip-bomb check)
 *  .xls  → SheetJS Community Edition (loaded only for .xls files)
 */
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { checkZip } from "./zip-guard";

export const MAX_FILE_BYTES = 4 * 1024 * 1024; // keeps uploads under typical serverless body limits (~4.5 MB)
export const MAX_DATA_ROWS = 5_000;
export const MAX_COLUMNS = 80;
export const MAX_CELL_CHARS = 10_000;

export type FileKind = "csv" | "xlsx" | "xls";
export type ParsedSheet = { sheetNames: string[]; sheetName: string | null; table: string[][] };
export class ImportFileError extends Error {}

export function detectFileKind(filename: string, buf: Buffer): FileKind {
  const ext = filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (!["csv", "xlsx", "xls"].includes(ext))
    throw new ImportFileError("Only .csv, .xlsx and .xls files can be imported.");
  if (buf.length === 0) throw new ImportFileError("The file is empty.");
  if (buf.length > MAX_FILE_BYTES)
    throw new ImportFileError(`The file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB. Split it into smaller files.`);
  const isZip = buf.length > 4 && buf.readUInt32LE(0) === 0x04034b50;
  const isOle = buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (ext === "xlsx" || ext === "xls") {
    if (isZip) return "xlsx";
    if (isOle) return "xls"; // genuine .xls, or an .xlsx that is password-protected (detected during parsing)
    throw new ImportFileError("This does not look like an Excel file. Save it again from Excel / Google Sheets as .xlsx.");
  }
  if (isZip || isOle) throw new ImportFileError("This is an Excel file with a .csv name. Rename it to .xlsx or export it as CSV again.");
  return "csv";
}

function decodeText(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder("utf-16le").decode(buf.subarray(2));
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder("utf-16be").decode(buf.subarray(2));
  const body = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf ? buf.subarray(3) : buf;
  if (body.includes(0)) throw new ImportFileError("The CSV file contains binary data and cannot be read.");
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    // Older Excel versions on Windows save "CSV" in the Windows-1252 code page.
    return new TextDecoder("windows-1252").decode(body);
  }
}

function clampCell(s: string): string {
  return s.length > MAX_CELL_CHARS ? s.slice(0, MAX_CELL_CHARS) : s;
}

function finishTable(rows: string[][]): string[][] {
  const out: string[][] = [];
  for (const r of rows) {
    if (out.length > MAX_DATA_ROWS + 20)
      throw new ImportFileError(`The sheet has more than ${MAX_DATA_ROWS.toLocaleString("en-IN")} rows. Split it into smaller files.`);
    out.push(r.slice(0, MAX_COLUMNS).map((c) => clampCell(c ?? "")));
  }
  // drop trailing completely-empty rows
  while (out.length && out[out.length - 1].every((c) => c.trim() === "")) out.pop();
  return out;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Formats an Excel date (stored as a UTC wall-clock value) as "YYYY-MM-DD" or "YYYY-MM-DD HH:MM". */
function excelDateToString(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  const date = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  const hasTime = d.getUTCHours() || d.getUTCMinutes();
  return hasTime ? `${date} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}` : date;
}

function numberToString(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (Number.isInteger(n)) return Math.abs(n) < 1e21 ? n.toFixed(0) : String(n);
  return String(Math.round(n * 1e6) / 1e6);
}

/** Converts an ExcelJS cell value into display text. Formulas use their cached result only. */
function excelJsValueToString(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return numberToString(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date) return excelDateToString(v);
  if (typeof v === "object") {
    if ("richText" in v && Array.isArray(v.richText)) return v.richText.map((t) => t.text).join("");
    if ("hyperlink" in v) {
      const text = typeof v.text === "string" ? v.text : excelJsValueToString(v.text as ExcelJS.CellValue);
      const link = typeof v.hyperlink === "string" ? v.hyperlink : "";
      if (/^https?:\/\//i.test(link) && !/^https?:\/\//i.test(text) && /^(photo|image|img|pic|link|view|open|click)/i.test(text.trim()))
        return link;
      return text;
    }
    if ("formula" in v || "sharedFormula" in v) {
      const result = (v as { result?: unknown }).result;
      if (result === undefined || result === null || (typeof result === "object" && "error" in (result as object))) return "";
      return excelJsValueToString(result as ExcelJS.CellValue);
    }
    if ("error" in v) return "";
  }
  return "";
}

async function parseXlsx(buf: Buffer, wantedSheet?: string | null): Promise<ParsedSheet> {
  const zip = checkZip(buf);
  if (!zip.ok) throw new ImportFileError(zip.error);
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
  } catch {
    throw new ImportFileError("The .xlsx file could not be read. Open it in Excel or Google Sheets and save it again.");
  }
  const sheets = wb.worksheets.filter((ws) => ws.state !== "veryHidden");
  const sheetNames = sheets.map((ws) => ws.name);
  const ws = pickSheet(sheets, wantedSheet, (s) => s.name, (s) => s.actualRowCount);
  if (!ws) throw new ImportFileError("The workbook has no sheets with data.");
  if (ws.rowCount > MAX_DATA_ROWS + 50 && ws.actualRowCount > MAX_DATA_ROWS + 20)
    throw new ImportFileError(`The sheet has more than ${MAX_DATA_ROWS.toLocaleString("en-IN")} rows. Split it into smaller files.`);
  const rows: string[][] = [];
  const colCount = Math.min(ws.columnCount, MAX_COLUMNS);
  ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNumber > MAX_DATA_ROWS + 50) return;
    const cells: string[] = [];
    for (let c = 1; c <= colCount; c++) cells.push(excelJsValueToString(row.getCell(c).value));
    rows[rowNumber - 1] = cells;
  });
  for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
  return { sheetNames, sheetName: ws.name, table: finishTable(rows) };
}

async function parseXls(buf: Buffer, wantedSheet?: string | null): Promise<ParsedSheet> {
  const XLSX = await import("@e965/xlsx");
  let wb: import("@e965/xlsx").WorkBook;
  try {
    wb = XLSX.read(buf, {
      type: "buffer",
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      cellDates: false,
      sheetRows: MAX_DATA_ROWS + 50,
      WTF: false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/password|encrypt/i.test(msg))
      throw new ImportFileError("Password-protected workbooks are not supported. Remove the password and upload again.");
    throw new ImportFileError("The .xls file could not be read. Open it in Excel and save it as .xlsx, then upload again.");
  }
  const sheetNames = wb.SheetNames.filter((n) => {
    const meta = wb.Workbook?.Sheets?.find((s) => s.name === n);
    return !meta || meta.Hidden !== 2;
  });
  const sheets = sheetNames.map((name) => ({ name, ws: wb.Sheets[name] }));
  const chosen = pickSheet(
    sheets,
    wantedSheet,
    (s) => s.name,
    (s) => (s.ws?.["!ref"] ? XLSX.utils.decode_range(s.ws["!ref"]).e.r + 1 : 0),
  );
  if (!chosen?.ws) throw new ImportFileError("The workbook has no sheets with data.");
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(chosen.ws, { header: 1, raw: true, defval: "", blankrows: true });
  const rows = aoa.map((r) =>
    (r as unknown[]).map((v) => {
      if (v === null || v === undefined) return "";
      if (typeof v === "number") return numberToString(v);
      if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
      if (v instanceof Date) return excelDateToString(v);
      return String(v);
    }),
  );
  return { sheetNames, sheetName: chosen.name, table: finishTable(rows) };
}

function parseCsv(buf: Buffer): ParsedSheet {
  const text = decodeText(buf);
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: false,
    delimiter: "", // auto-detect , ; tab |
    preview: MAX_DATA_ROWS + 50,
  });
  if (result.errors.some((e) => e.type === "Quotes"))
    throw new ImportFileError("The CSV file has unbalanced quotation marks. Export it again from Excel / Google Sheets.");
  return { sheetNames: [], sheetName: null, table: finishTable(result.data as string[][]) };
}

function pickSheet<T>(sheets: T[], wanted: string | null | undefined, name: (s: T) => string, rows: (s: T) => number): T | undefined {
  if (wanted) {
    const exact = sheets.find((s) => name(s) === wanted);
    if (exact) return exact;
  }
  const listings = sheets.find((s) => /^listings?$/i.test(name(s).trim()) && rows(s) > 0);
  return listings ?? sheets.find((s) => rows(s) > 0) ?? sheets[0];
}

export async function parseSpreadsheet(filename: string, buf: Buffer, wantedSheet?: string | null): Promise<ParsedSheet & { kind: FileKind }> {
  const kind = detectFileKind(filename, buf);
  const parsed = kind === "csv" ? parseCsv(buf) : kind === "xlsx" ? await parseXlsx(buf, wantedSheet) : await parseXls(buf, wantedSheet);
  if (parsed.table.length === 0) throw new ImportFileError("The sheet is empty.");
  return { ...parsed, kind };
}
