/**
 * Import analysis: validates every row and classifies it against the current database
 * as add / update / unchanged / skipped / rejected. Used for the preview AND re-run
 * inside the commit transaction, so the preview can never drift from what is written.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { ImportRowResult, ImportSummary, Listing } from "@/db/schema";
import type { Database } from "@/db";
import type { ListingFieldKey } from "@/lib/listings/fields";
import { parseListingId } from "@/lib/listings/normalize";
import { changedFields, contentHash, validateListingRow, type NormalisedListing } from "@/lib/listings/validate";
import type { ColumnMapping } from "./mapping";

export type PlannedRow =
  | { kind: "add"; row: number; listing: NormalisedListing; hash: string; sourceUpdatedAt: Date | null }
  | { kind: "update"; row: number; listing: NormalisedListing; hash: string; sourceUpdatedAt: Date | null; existingId: string; changed: string[] };

export type Analysis = { summary: ImportSummary; results: ImportRowResult[]; plan: PlannedRow[]; notInFile: number };

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Either the pooled client or an open transaction. */
export type DbOrTx = Database | Tx;

export async function analyseRows(
  db: DbOrTx,
  rows: string[][],
  mapping: ColumnMapping,
  headerRow: number,
  now = new Date(),
): Promise<Analysis> {
  const results: ImportRowResult[] = [];
  const candidates: { row: number; listing: NormalisedListing; sourceUpdatedAt: Date | null; warnings: string[] }[] = [];
  const firstSeen = new Map<string, number>();

  let blankRows = 0;
  rows.forEach((cells, i) => {
    const rowNumber = headerRow + 1 + i;
    if (cells.every((c) => (c ?? "").trim() === "")) {
      blankRows++; // empty rows are ignored silently (common between blocks of data)
      return;
    }
    const raw: Partial<Record<ListingFieldKey, string>> = {};
    for (const [field, idx] of Object.entries(mapping)) if (idx !== undefined) raw[field as ListingFieldKey] = cells[idx] ?? "";
    const idParsed = parseListingId(raw.listing_id);
    const id = idParsed.ok ? idParsed.value : null;
    const v = validateListingRow(raw, now);
    if (id) {
      const dup = firstSeen.get(id);
      if (dup !== undefined) {
        results.push({
          row: rowNumber,
          listingId: id,
          outcome: "rejected",
          errors: [`Duplicate listing_id — it already appears on row ${dup}. Only the first occurrence is processed.`],
          warnings: v.warnings,
          changedFields: [],
        });
        return;
      }
      firstSeen.set(id, rowNumber);
    }
    if (!v.listing) {
      results.push({ row: rowNumber, listingId: id, outcome: "rejected", errors: v.errors, warnings: v.warnings, changedFields: [] });
      return;
    }
    candidates.push({ row: rowNumber, listing: v.listing, sourceUpdatedAt: v.sourceUpdatedAt, warnings: v.warnings });
  });

  // Load the existing versions of every listing referenced in the file.
  const ids = candidates.map((c) => c.listing.listingId);
  const existing = new Map<string, Listing>();
  const L = schema.listings;
  for (let i = 0; i < ids.length; i += 1000) {
    const chunk = ids.slice(i, i + 1000);
    const found: Listing[] = await db.select().from(L).where(inArray(L.listingId, chunk));
    for (const f of found) existing.set(f.listingId, f);
  }

  const plan: PlannedRow[] = [];
  for (const c of candidates) {
    const hash = contentHash(c.listing);
    const ex = existing.get(c.listing.listingId);
    const base = { row: c.row, listingId: c.listing.listingId, warnings: c.warnings };
    if (!ex) {
      plan.push({ kind: "add", row: c.row, listing: c.listing, hash, sourceUpdatedAt: c.sourceUpdatedAt });
      results.push({ ...base, outcome: "add", errors: [], changedFields: [] });
      continue;
    }
    if (ex.isDemo) {
      results.push({ ...base, outcome: "rejected", errors: ["This listing_id belongs to a demo listing. Use a different ID."], changedFields: [] });
      continue;
    }
    if (c.sourceUpdatedAt && ex.sourceUpdatedAt && c.sourceUpdatedAt.getTime() < ex.sourceUpdatedAt.getTime()) {
      results.push({
        ...base,
        outcome: "skipped",
        errors: [],
        warnings: [
          `Older than the version already on the website (file: ${c.sourceUpdatedAt.toISOString().slice(0, 10)}, website: ${ex.sourceUpdatedAt.toISOString().slice(0, 10)}) — not applied`,
          ...c.warnings,
        ],
        changedFields: [],
      });
      continue;
    }
    if (ex.contentHash === hash) {
      results.push({ ...base, outcome: "unchanged", errors: [], changedFields: [] });
      continue;
    }
    const changed = changedFields(ex as unknown as Record<string, unknown>, c.listing);
    plan.push({ kind: "update", row: c.row, listing: c.listing, hash, sourceUpdatedAt: c.sourceUpdatedAt, existingId: ex.id, changed });
    results.push({ ...base, outcome: "update", errors: [], changedFields: changed });
  }

  results.sort((a, b) => a.row - b.row);
  const count = (o: ImportRowResult["outcome"]) => results.filter((r) => r.outcome === o).length;
  const summary: ImportSummary = {
    total: results.length,
    added: count("add"),
    updated: count("update"),
    unchanged: count("unchanged"),
    skipped: count("skipped"),
    rejected: count("rejected"),
    blank: blankRows,
  };

  // Informational only: listings that exist on the website but are not in this file are never touched.
  const [{ notInFile }] = await db
    .select({ notInFile: sql<number>`count(*)::int` })
    .from(L)
    .where(and(eq(L.isDemo, false), ids.length ? sql`${L.listingId} <> all(${sql.param(ids)}::text[])` : undefined));

  return { summary, results, plan, notInFile };
}
