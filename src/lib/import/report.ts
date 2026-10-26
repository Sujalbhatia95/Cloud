import type { ImportRowResult } from "@/db/schema";

/** Neutralises spreadsheet formula injection (cells starting with = + - @ tab CR). */
function safeCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][]): string {
  // BOM so Excel opens UTF-8 (₹ etc.) correctly
  return "﻿" + rows.map((r) => r.map(safeCell).join(",")).join("\r\n") + "\r\n";
}

const OUTCOME_LABEL: Record<ImportRowResult["outcome"], string> = {
  add: "Added",
  update: "Updated",
  unchanged: "Unchanged",
  skipped: "Skipped",
  rejected: "Rejected",
};

export function resultsToCsv(results: ImportRowResult[], onlyProblems: boolean): string {
  const rows = results.filter((r) => !onlyProblems || r.outcome === "rejected" || r.outcome === "skipped" || r.warnings.length > 0);
  return toCsv([
    ["spreadsheet_row", "listing_id", "result", "errors", "warnings", "changed_fields"],
    ...rows.map((r) => [
      r.row,
      r.listingId ?? "",
      OUTCOME_LABEL[r.outcome],
      r.errors.join(" | "),
      r.warnings.join(" | "),
      r.changedFields.join(", "),
    ]),
  ]);
}
