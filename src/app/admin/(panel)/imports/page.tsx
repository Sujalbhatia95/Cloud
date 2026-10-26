import Link from "next/link";
import { desc } from "drizzle-orm";
import { UploadForm } from "@/components/admin/UploadForm";
import { Card, EmptyRow, Notice, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { IconDownload } from "@/components/ui/icons";
import { getDb, schema } from "@/db";
import { requirePage } from "@/lib/auth/guards";
import { formatDateTimeIST } from "@/lib/listings/format";
import { LISTING_FIELDS } from "@/lib/listings/fields";

export default async function ImportsPage({ searchParams }: PageProps<"/admin/imports">) {
  await requirePage("imports");
  const sp = await searchParams;
  const batches = await getDb()
    .select({
      id: schema.importBatches.id,
      filename: schema.importBatches.filename,
      status: schema.importBatches.status,
      summary: schema.importBatches.summary,
      createdAt: schema.importBatches.createdAt,
      createdByEmail: schema.importBatches.createdByEmail,
      fileType: schema.importBatches.fileType,
    })
    .from(schema.importBatches)
    .orderBy(desc(schema.importBatches.createdAt))
    .limit(40);

  return (
    <>
      <PageHeader title="Spreadsheet imports" description="Upload your weekly listings file. Listings are matched by listing_id: same ID updates, new ID adds. Nothing is ever deleted automatically." />
      <Notice notice={sp.notice} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card title="1 · Upload">
          <UploadForm />
        </Card>
        <Card title="Template & guidance">
          <div className="space-y-3 text-sm">
            <a className="btn btn-outline w-full justify-start" href="/api/admin/template?format=xlsx">
              <IconDownload size={18} /> Excel template (.xlsx) with dropdowns & instructions
            </a>
            <a className="btn btn-outline w-full justify-start" href="/api/admin/template?format=csv">
              <IconDownload size={18} /> CSV template (headers only)
            </a>
            <a className="btn btn-outline w-full justify-start" href="/api/admin/template?format=csv-example">
              <IconDownload size={18} /> CSV with 3 example rows
            </a>
            <ul className="list-disc space-y-1 pl-5 pt-2 text-muted">
              <li>Your own column names are fine — you can map them on the next screen and save the mapping for next week.</li>
              <li>To take a property off the website, set <code>listing_status</code> to Archived, Sold or Rented.</li>
              <li>Required: {LISTING_FIELDS.filter((f) => f.required).map((f) => f.key).join(", ")}.</li>
            </ul>
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-10 text-sm font-bold uppercase tracking-[0.12em] text-ink">History</h2>
      <Table>
        <thead>
          <tr>
            <th>Uploaded</th>
            <th>File</th>
            <th>By</th>
            <th>Status</th>
            <th>Result</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {batches.length === 0 ? <EmptyRow colSpan={6} text="No imports yet." /> : null}
          {batches.map((b) => (
            <tr key={b.id}>
              <td className="whitespace-nowrap">{formatDateTimeIST(b.createdAt)}</td>
              <td>
                {b.filename} <span className="text-xs uppercase text-muted">{b.fileType}</span>
              </td>
              <td className="text-xs">{b.createdByEmail}</td>
              <td><StatusBadge status={b.status} /></td>
              <td className="text-xs text-muted">
                {b.summary ? `${b.summary.added} added · ${b.summary.updated} updated · ${b.summary.unchanged} unchanged · ${b.summary.skipped} skipped · ${b.summary.rejected} rejected` : "—"}
              </td>
              <td><Link className="link text-sm" href={`/admin/imports/${b.id}`}>Open</Link></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
