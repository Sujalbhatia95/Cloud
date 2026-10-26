import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { Card, Notice, PageHeader, Stat, StatusBadge, Table, EmptyRow, first } from "@/components/admin/ui";
import { getDb, schema } from "@/db";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/roles";
import { runAutoChecks } from "@/lib/compliance";
import { formatDateTimeIST } from "@/lib/listings/format";
import { getSettings } from "@/lib/settings";

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  const user = await requirePage("dashboard");
  const sp = await searchParams;
  const db = getDb();
  const settings = await getSettings();
  const [counts] = await db
    .select({
      active: sql<number>`count(*) filter (where listing_status = 'active' and not is_demo)::int`,
      total: sql<number>`count(*) filter (where not is_demo)::int`,
      demo: sql<number>`count(*) filter (where is_demo)::int`,
    })
    .from(schema.listings);
  const canEnq = can(user.role, "enquiries");
  const [enq] = canEnq
    ? await db.execute<{ showings: number; sellers: number; contacts: number; failed: number }>(sql`select
        (select count(*) from showing_requests where status = 'new')::int as showings,
        (select count(*) from seller_enquiries where status = 'new')::int as sellers,
        (select count(*) from contact_messages where status = 'new')::int as contacts,
        (select count(*) from email_outbox where status = 'failed')::int as failed`).then((r) => r.rows)
    : [null];
  const [lastImport] = can(user.role, "imports")
    ? await db.select().from(schema.importBatches).orderBy(desc(schema.importBatches.createdAt)).limit(1)
    : [];
  const blockers = can(user.role, "compliance") ? (await runAutoChecks()).filter((c) => c.level === "blocker").length : null;
  const recent = canEnq ? await db.select().from(schema.showingRequests).orderBy(desc(schema.showingRequests.createdAt)).limit(6) : [];

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} description="Overview of listings, enquiries and launch readiness." />
      {first(sp.denied) ? <Notice error="You don't have permission to open that page." /> : null}
      {settings.demoMode ? (
        <div className="mb-6 border-l-4 border-gold bg-demo-50 px-4 py-3 text-sm text-demo">
          <strong>Demo mode is ON.</strong> Demo listings and the demo banner are visible on the public website.{" "}
          {can(user.role, "settings") ? <Link className="underline" href="/admin/settings#demo">Turn it off before launch.</Link> : null}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active listings" value={counts.active} href="/admin/listings?status=active" />
        <Stat label="All listings" value={counts.total} href="/admin/listings" />
        {enq ? <Stat label="New showing requests" value={enq.showings} tone={enq.showings ? "warn" : "default"} href="/admin/enquiries?tab=showings&status=new" /> : null}
        {enq ? <Stat label="New owner enquiries" value={enq.sellers + enq.contacts} tone={enq.sellers + enq.contacts ? "warn" : "default"} href="/admin/enquiries?tab=sellers&status=new" /> : null}
        {enq ? <Stat label="Failed emails" value={enq.failed} tone={enq.failed ? "bad" : "good"} href="/admin/emails?status=failed" /> : null}
        {blockers !== null ? <Stat label="Launch blockers" value={blockers} tone={blockers ? "bad" : "good"} href="/admin/compliance" /> : null}
        <Stat label="Demo listings" value={counts.demo} href={can(user.role, "settings") ? "/admin/settings#demo" : undefined} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {can(user.role, "imports") ? (
          <Card title="Weekly spreadsheet upload" actions={<Link href="/admin/imports" className="btn btn-primary btn-sm">Upload file</Link>}>
            {lastImport ? (
              <div className="text-sm">
                <p>
                  Last import: <strong>{lastImport.filename}</strong> · {formatDateTimeIST(lastImport.createdAt)} <StatusBadge status={lastImport.status} />
                </p>
                {lastImport.summary ? (
                  <p className="mt-2 text-muted">
                    {lastImport.summary.added} added · {lastImport.summary.updated} updated · {lastImport.summary.unchanged} unchanged ·{" "}
                    {lastImport.summary.skipped} skipped · {lastImport.summary.rejected} rejected
                  </p>
                ) : null}
                <Link href={`/admin/imports/${lastImport.id}`} className="link mt-3 inline-block">Open report</Link>
              </div>
            ) : (
              <p className="text-sm text-muted">No imports yet. Download the template from the imports page to get started.</p>
            )}
          </Card>
        ) : null}
        {canEnq ? (
          <Card title="Latest showing requests" actions={<Link href="/admin/enquiries" className="link text-sm">View all</Link>}>
            <Table>
              <thead>
                <tr><th>Received</th><th>Customer</th><th>Property</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recent.length === 0 ? <EmptyRow colSpan={4} text="No showing requests yet." /> : null}
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{formatDateTimeIST(r.createdAt)}</td>
                    <td><Link className="link" href={`/admin/enquiries/showing/${r.id}`}>{r.name}</Link></td>
                    <td>{r.listingId}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ) : null}
      </div>
    </>
  );
}

