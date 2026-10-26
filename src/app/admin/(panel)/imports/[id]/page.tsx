import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ConfirmButton, PendingButton } from "@/components/admin/ConfirmButton";
import { Card, EmptyRow, Notice, PageHeader, Stat, StatusBadge, Table, first } from "@/components/admin/ui";
import { getDb, schema } from "@/db";
import type { ImportRowResult } from "@/db/schema";
import { requirePage } from "@/lib/auth/guards";
import { formatDateTimeIST } from "@/lib/listings/format";
import { LISTING_FIELDS } from "@/lib/listings/fields";
import { cancelImportAction, commitImportAction, previewImportAction, switchSheetAction } from "../../../actions/imports";

const OUTCOMES: Record<ImportRowResult["outcome"], string> = {
  add: "Will add / added",
  update: "Will update / updated",
  unchanged: "Unchanged",
  skipped: "Skipped",
  rejected: "Rejected",
};

export default async function ImportDetail({ params, searchParams }: PageProps<"/admin/imports/[id]">) {
  await requirePage("imports");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const B = schema.importBatches;
  const [b] = await getDb()
    .select({
      id: B.id, filename: B.filename, fileType: B.fileType, fileSize: B.fileSize, sheetName: B.sheetName, sheetNames: B.sheetNames,
      headerRow: B.headerRow, headers: B.headers, rows: B.rows, mapping: B.mapping, status: B.status, summary: B.summary,
      results: B.results, error: B.error, createdAt: B.createdAt, createdByEmail: B.createdByEmail, completedAt: B.completedAt,
    })
    .from(B)
    .where(eq(B.id, id))
    .limit(1);
  if (!b) notFound();
  const open = b.status === "uploaded" || b.status === "previewed";
  const show = first(sp.show) || (b.status === "completed" ? "all" : "problems");
  const results = (b.results ?? []).filter((r) =>
    show === "all" ? true : show === "problems" ? r.outcome === "rejected" || r.outcome === "skipped" || r.warnings.length > 0 : r.outcome === show,
  );
  const sample = b.rows.filter((r) => r.some((c) => c.trim() !== "")).slice(0, 5);

  return (
    <>
      <PageHeader
        title={`Import: ${b.filename}`}
        description={
          <>
            <StatusBadge status={b.status} /> · {b.fileType.toUpperCase()} · {(b.fileSize / 1024).toFixed(0)} KB · uploaded {formatDateTimeIST(b.createdAt)} by {b.createdByEmail}
            {b.sheetName ? ` · sheet "${b.sheetName}"` : ""} · header on row {b.headerRow} · {b.rows.length} data rows
          </>
        }
        actions={<Link href="/admin/imports" className="btn btn-outline btn-sm">All imports</Link>}
      />
      <Notice notice={sp.notice} error={sp.error} />
      {b.status === "failed" && b.error ? <Notice error={b.error} /> : null}

      {open ? (
        <>
          {b.sheetNames.length > 1 ? (
            <form action={switchSheetAction} className="mb-6 flex flex-wrap items-end gap-3 border border-stone bg-white p-4">
              <input type="hidden" name="id" value={b.id} />
              <label>
                <span className="field-label">Sheet to import</span>
                <select name="sheet" defaultValue={b.sheetName ?? ""} className="field">
                  {b.sheetNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <PendingButton className="btn btn-outline btn-sm">Use this sheet</PendingButton>
            </form>
          ) : null}

          <Card title="Your file (first rows)">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    {b.headers.map((h, i) => (
                      <th key={i} className="whitespace-nowrap border border-stone bg-sand px-2 py-1.5 text-left font-semibold">
                        <span className="text-muted">{String.fromCharCode(65 + (i % 26))}{i >= 26 ? Math.floor(i / 26) : ""} · </span>{h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sample.map((r, ri) => (
                    <tr key={ri}>
                      {b.headers.map((_, ci) => (
                        <td key={ci} className="max-w-48 truncate border border-stone px-2 py-1">{r[ci]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <form action={previewImportAction} className="mt-6">
            <input type="hidden" name="id" value={b.id} />
            <Card title="2 · Match your columns">
              <p className="mb-4 text-sm text-muted">
                We matched columns automatically where we could. Check each field and choose &ldquo;— not in my file —&rdquo; for anything you don&apos;t have.
                Required fields are marked *.
              </p>
              <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
                {LISTING_FIELDS.map((f) => (
                  <label key={f.key} className="grid grid-cols-[1fr_1.2fr] items-center gap-3 border-b border-stone pb-2 text-sm">
                    <span>
                      <span className="font-semibold">{f.label}</span>
                      {f.required ? <span className="text-danger"> *</span> : null}
                      <span className="block font-mono text-[0.68rem] text-muted">{f.key}</span>
                    </span>
                    <select name={`map_${f.key}`} defaultValue={b.mapping?.[f.key] !== undefined ? String(b.mapping[f.key]) : ""} className="field !min-h-9 !py-1 text-sm">
                      <option value="">— not in my file —</option>
                      {b.headers.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-end gap-3">
                <label className="min-w-64 flex-1">
                  <span className="field-label">Remember this mapping as (optional)</span>
                  <input name="profile_name" className="field" placeholder="e.g. My weekly listings sheet" maxLength={80} />
                </label>
                <PendingButton className="btn btn-primary" pendingText="Validating…">Validate & preview</PendingButton>
              </div>
            </Card>
          </form>
        </>
      ) : null}

      {b.summary ? (
        <section id="preview" className="mt-10 scroll-mt-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-ink">
            {b.status === "completed" ? "3 · Result" : "3 · Preview — nothing has changed yet"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label={b.status === "completed" ? "Added" : "To add"} value={b.summary.added} tone="good" />
            <Stat label={b.status === "completed" ? "Updated" : "To update"} value={b.summary.updated} tone="good" />
            <Stat label="Unchanged" value={b.summary.unchanged} />
            <Stat label="Skipped" value={b.summary.skipped} tone={b.summary.skipped ? "warn" : "default"} />
            <Stat label="Rejected" value={b.summary.rejected} tone={b.summary.rejected ? "bad" : "default"} />
            <Stat label="Blank rows ignored" value={b.summary.blank ?? 0} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Show:</span>
            {[["problems", "Problems & warnings"], ["all", "All rows"], ...Object.entries(OUTCOMES)].map(([k, v]) => (
              <Link key={k} href={`/admin/imports/${b.id}?show=${k}#preview`} className={`badge ${show === k ? "badge-blue" : "badge-muted"}`}>{v}</Link>
            ))}
            <a className="link ml-auto" href={`/api/admin/imports/${b.id}/report?only=problems`}>Download error report (CSV)</a>
            <a className="link" href={`/api/admin/imports/${b.id}/report`}>Full report (CSV)</a>
          </div>
          <div className="mt-4">
            <Table>
              <thead>
                <tr><th>Row</th><th>Listing ID</th><th>Result</th><th>Details</th></tr>
              </thead>
              <tbody>
                {results.length === 0 ? <EmptyRow colSpan={4} text="Nothing to show for this filter." /> : null}
                {results.slice(0, 300).map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td className="font-mono text-xs">{r.listingId ?? "—"}</td>
                    <td><StatusBadge status={r.outcome === "rejected" ? "failed" : r.outcome === "skipped" ? "warning" : r.outcome === "unchanged" ? "draft" : "ok"} label={OUTCOMES[r.outcome]} /></td>
                    <td className="text-xs">
                      {r.errors.map((e) => <p key={e} className="text-danger">✕ {e}</p>)}
                      {r.changedFields.length ? <p>Changes: {r.changedFields.join(", ")}</p> : null}
                      {r.warnings.map((w) => <p key={w} className="text-gold-700">! {w}</p>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {results.length > 300 ? <p className="mt-2 text-xs text-muted">Showing the first 300 of {results.length}. Download the report for all rows.</p> : null}
          </div>

          {b.status === "previewed" ? (
            <div className="mt-8 grid gap-4 border-2 border-royal bg-royal-50 p-6 lg:grid-cols-[1fr_auto]">
              <form action={commitImportAction} className="space-y-3">
                <input type="hidden" name="id" value={b.id} />
                <p className="font-display text-2xl text-navy">Confirm import</p>
                <p className="text-sm text-ink">
                  {b.summary.added} listing(s) will be added and {b.summary.updated} updated. Rejected and skipped rows are left untouched.
                  Listings that are not in this file are <strong>not</strong> deleted or changed. The data is re-checked when you confirm, and if anything
                  fails, nothing is changed.
                </p>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="strict" className="mt-1 accent-royal" />
                  Only import if every row is valid (cancel the whole import if any row is rejected)
                </label>
                <label className="flex items-start gap-2 text-sm font-semibold">
                  <input type="checkbox" name="confirm" required className="mt-1 accent-royal" />
                  I have reviewed the preview and want to apply these changes to the live website
                </label>
                <PendingButton className="btn btn-primary" pendingText="Importing…">Confirm import</PendingButton>
              </form>
              <form action={cancelImportAction} className="self-end">
                <input type="hidden" name="id" value={b.id} />
                <ConfirmButton message="Cancel this import? No listings will change.">Cancel import</ConfirmButton>
              </form>
            </div>
          ) : null}
          {b.status === "completed" ? (
            <p className="mt-6 text-sm">
              Completed {b.completedAt ? formatDateTimeIST(b.completedAt) : ""}. <Link className="link" href="/admin/listings">Go to listings</Link>
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
