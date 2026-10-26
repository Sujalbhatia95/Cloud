/**
 * Upload → preview → confirm. Every write happens inside a single database transaction
 * guarded by an advisory lock: if anything fails, nothing is changed.
 */
import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Database } from "@/db";
import type { ImportBatch } from "@/db/schema";
import { analyseRows, type Analysis } from "./process";
import {
  autoMap,
  detectHeaderRow,
  headerSignature,
  mappingFromProfile,
  missingRequired,
  profileFromMapping,
  type ColumnMapping,
} from "./mapping";
import { parseSpreadsheet, ImportFileError } from "./parse-file";

const IMPORT_LOCK_KEY = 74_210_001; // arbitrary constant shared by all import commits
const B = schema.importBatches;

export class ImportError extends Error {}

export type Actor = { id: string; email: string };

function splitTable(table: string[][]) {
  const headerIdx = detectHeaderRow(table);
  const headers = (table[headerIdx] ?? []).map((h, i) => h.trim() || `Column ${i + 1}`);
  const rows = table.slice(headerIdx + 1).map((r) => headers.map((_, i) => r[i] ?? ""));
  return { headers, rows, headerRow: headerIdx + 1 };
}

async function initialMapping(db: Database, headers: string[]): Promise<{ mapping: ColumnMapping; profile: string | null }> {
  const [profile] = await db
    .select()
    .from(schema.mappingProfiles)
    .where(eq(schema.mappingProfiles.headerSignature, headerSignature(headers)))
    .limit(1);
  if (profile) {
    const mapping = mappingFromProfile(profile.mapping, headers);
    if (missingRequired(mapping).length === 0) return { mapping, profile: profile.name };
  }
  return { mapping: autoMap(headers), profile: null };
}

/** Step 1: parse the uploaded file and store it as a pending batch. Nothing touches listings yet. */
export async function createBatch(db: Database, file: { name: string; data: Buffer }, actor: Actor) {
  const parsed = await parseSpreadsheet(file.name, file.data);
  const { headers, rows, headerRow } = splitTable(parsed.table);
  if (rows.length === 0) throw new ImportFileError("No data rows were found under the header row.");
  const { mapping, profile } = await initialMapping(db, headers);
  const [batch] = await db
    .insert(B)
    .values({
      createdBy: actor.id,
      createdByEmail: actor.email,
      filename: file.name.slice(0, 200),
      fileType: parsed.kind,
      fileSize: file.data.length,
      fileSha256: createHash("sha256").update(file.data).digest("hex"),
      sheetName: parsed.sheetName,
      sheetNames: parsed.sheetNames,
      fileData: parsed.kind === "csv" ? null : file.data,
      headerRow,
      headers,
      rows,
      mapping,
      status: "uploaded",
    })
    .returning({ id: B.id });
  return { id: batch.id, profile };
}

/** Re-parses the stored workbook using a different sheet. */
export async function switchSheet(db: Database, batchId: string, sheetName: string) {
  const batch = await loadOpenBatch(db, batchId);
  if (!batch.fileData) throw new ImportError("This file has only one sheet.");
  const parsed = await parseSpreadsheet(batch.filename, batch.fileData, sheetName);
  const { headers, rows, headerRow } = splitTable(parsed.table);
  if (rows.length === 0) throw new ImportFileError(`Sheet "${sheetName}" has no data rows.`);
  const { mapping } = await initialMapping(db, headers);
  await db
    .update(B)
    .set({ sheetName: parsed.sheetName, headers, rows, headerRow, mapping, status: "uploaded", summary: null, results: null, updatedAt: new Date() })
    .where(eq(B.id, batchId));
}

export async function loadOpenBatch(db: Database, batchId: string): Promise<ImportBatch> {
  const [batch] = await db.select().from(B).where(eq(B.id, batchId)).limit(1);
  if (!batch) throw new ImportError("Import not found.");
  if (batch.status !== "uploaded" && batch.status !== "previewed")
    throw new ImportError(`This import is already ${batch.status}. Upload the file again to start a new import.`);
  return batch;
}

/** Step 2: save the column mapping and compute the preview. */
export async function previewBatch(
  db: Database,
  batchId: string,
  mapping: ColumnMapping,
  opts: { saveProfileAs?: string | null } = {},
): Promise<Analysis> {
  const batch = await loadOpenBatch(db, batchId);
  const missing = missingRequired(mapping);
  if (missing.length) throw new ImportError(`Map these required columns first: ${missing.join(", ")}`);
  const analysis = await analyseRows(db, batch.rows, mapping, batch.headerRow);
  await db
    .update(B)
    .set({ mapping, status: "previewed", summary: analysis.summary, results: analysis.results, updatedAt: new Date() })
    .where(eq(B.id, batchId));
  if (opts.saveProfileAs) {
    const profile = profileFromMapping(mapping, batch.headers);
    await db
      .insert(schema.mappingProfiles)
      .values({ name: opts.saveProfileAs.slice(0, 80), headerSignature: headerSignature(batch.headers), mapping: profile })
      .onConflictDoUpdate({
        target: schema.mappingProfiles.headerSignature,
        set: { name: opts.saveProfileAs.slice(0, 80), mapping: profile, updatedAt: new Date() },
      });
  }
  return analysis;
}

export type CommitOptions = {
  /** Abort the whole import if any row is rejected. */
  strict?: boolean;
  /** Test-only hook: throw after writing this many rows, to prove the transaction rolls back. */
  failAfterWrites?: number;
};

/** Step 3: the explicit confirmation. Re-validates against the live database inside one transaction. */
export async function commitBatch(db: Database, batchId: string, actor: Actor, opts: CommitOptions = {}) {
  try {
    const analysis = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${IMPORT_LOCK_KEY})`);
      const [batch] = await tx.select().from(B).where(eq(B.id, batchId)).for("update");
      if (!batch) throw new ImportError("Import not found.");
      if (batch.status !== "previewed") throw new ImportError(`This import is ${batch.status}; it cannot be confirmed again.`);
      if (!batch.mapping) throw new ImportError("Column mapping is missing.");

      const a = await analyseRows(tx, batch.rows, batch.mapping, batch.headerRow);
      if (opts.strict && a.summary.rejected > 0)
        throw new ImportError(`${a.summary.rejected} row(s) were rejected and "only import if every row is valid" was selected. Nothing was changed.`);

      const now = new Date();
      let writes = 0;
      const afterWrite = (n: number) => {
        writes += n;
        if (opts.failAfterWrites !== undefined && writes >= opts.failAfterWrites)
          throw new Error("Simulated failure during import (test hook)");
      };

      const adds = a.plan.filter((p) => p.kind === "add");
      for (let i = 0; i < adds.length; i += 200) {
        const chunk = adds.slice(i, i + 200);
        await tx.insert(schema.listings).values(
          chunk.map((p) => ({
            ...p.listing,
            contentHash: p.hash,
            sourceUpdatedAt: p.sourceUpdatedAt,
            source: "import",
            lastImportId: batch.id,
            isDemo: false,
            createdAt: now,
            updatedAt: now,
          })),
        );
        afterWrite(chunk.length);
      }
      for (const p of a.plan) {
        if (p.kind !== "update") continue;
        await tx
          .update(schema.listings)
          .set({
            ...p.listing,
            contentHash: p.hash,
            sourceUpdatedAt: p.sourceUpdatedAt ?? undefined,
            source: "import",
            lastImportId: batch.id,
            updatedAt: now,
          })
          .where(and(eq(schema.listings.id, p.existingId), eq(schema.listings.isDemo, false)));
        afterWrite(1);
      }

      await tx
        .update(B)
        .set({
          status: "completed",
          summary: a.summary,
          results: a.results,
          fileData: null,
          confirmedAt: now,
          completedAt: now,
          updatedAt: now,
          error: null,
        })
        .where(eq(B.id, batch.id));
      await tx.insert(schema.auditLog).values({
        userId: actor.id,
        userEmail: actor.email,
        action: "import.completed",
        entity: "import_batch",
        entityId: batch.id,
        details: { ...a.summary, filename: batch.filename },
      });
      return a;
    });
    return { ok: true as const, analysis };
  } catch (e) {
    const message = e instanceof ImportError ? e.message : "The import failed and was rolled back. No listings were changed.";
    if (!(e instanceof ImportError)) console.error("[import] commit failed", e);
    // Record the failure (outside the rolled-back transaction) unless the batch was already finalised.
    await db
      .update(B)
      .set({
        status: "failed",
        error: e instanceof ImportError || !(e instanceof Error) ? message : `${message} Technical detail: ${e.message.slice(0, 300)}`,
        fileData: null,
        updatedAt: new Date(),
      })
      .where(and(eq(B.id, batchId), eq(B.status, "previewed")));
    return { ok: false as const, error: message };
  }
}

export async function cancelBatch(db: Database, batchId: string) {
  await db
    .update(B)
    .set({ status: "cancelled", fileData: null, updatedAt: new Date() })
    .where(and(eq(B.id, batchId), sql`${B.status} in ('uploaded','previewed')`));
}
