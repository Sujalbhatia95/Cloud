import Link from "next/link";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { EmptyRow, Notice, PageHeader, StatusBadge, Table, first } from "@/components/admin/ui";
import { getDb, schema } from "@/db";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/roles";
import { emailStatusFor } from "@/lib/email/outbox";
import { CONTACT_SUBJECTS, SELLER_ENQUIRY_TYPES, SHOWING_TIMES } from "@/lib/forms/schemas";
import { formatDateIST, formatDateTimeIST, propertyTypeLabel } from "@/lib/listings/format";
import { getSettings } from "@/lib/settings";
import { ENQUIRY_STATUSES } from "@/lib/enquiry-statuses";
import { purgeEnquiriesAction } from "../../actions/enquiries";

const TABS = [
  ["showings", "Showing requests"],
  ["sellers", "Owner / seller enquiries"],
  ["contacts", "Contact messages"],
] as const;

export default async function EnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  const user = await requirePage("enquiries");
  const sp = await searchParams;
  const tab = (["showings", "sellers", "contacts"] as const).find((t) => t === first(sp.tab)) ?? "showings";
  const status = first(sp.status);
  const q = first(sp.q).trim().slice(0, 80);
  const p = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const db = getDb();
  const settings = await getSettings();

  let body: React.ReactNode;
  if (tab === "showings") {
    const T = schema.showingRequests;
    const conds: SQL[] = [];
    if (status) conds.push(eq(T.status, status));
    if (q) conds.push(or(ilike(T.name, p), ilike(T.email, p), ilike(T.phone, p), ilike(T.listingId, p), ilike(T.reference, p))!);
    const rows = await db.select().from(T).where(conds.length ? and(...conds) : undefined).orderBy(desc(T.createdAt)).limit(200);
    const mail = await emailStatusFor(rows.map((r) => r.id));
    body = (
      <Table>
        <thead><tr><th>Received</th><th>Customer</th><th>Property</th><th>Requested</th><th>Status</th><th>Email</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow colSpan={6} text="No showing requests." /> : null}
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap text-xs">{formatDateTimeIST(r.createdAt)}<br /><span className="font-mono text-muted">{r.reference}</span></td>
              <td><Link className="link font-semibold" href={`/admin/enquiries/showing/${r.id}`}>{r.name}</Link><br /><span className="text-xs text-muted">{r.phone}</span></td>
              <td className="text-xs"><span className="font-mono">{r.listingId}</span><br />{r.propertyTitle}</td>
              <td className="text-xs">{formatDateIST(r.preferredDate)}<br />{SHOWING_TIMES[r.preferredTime as keyof typeof SHOWING_TIMES] ?? r.preferredTime}</td>
              <td><StatusBadge status={r.status} /></td>
              <td><StatusBadge status={mail.get(r.id)?.status ?? "pending"} /></td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  } else if (tab === "sellers") {
    const T = schema.sellerEnquiries;
    const conds: SQL[] = [];
    if (status) conds.push(eq(T.status, status));
    if (q) conds.push(or(ilike(T.ownerName, p), ilike(T.email, p), ilike(T.phone, p), ilike(T.city, p), ilike(T.reference, p))!);
    const rows = await db.select().from(T).where(conds.length ? and(...conds) : undefined).orderBy(desc(T.createdAt)).limit(200);
    const mail = await emailStatusFor(rows.map((r) => r.id));
    body = (
      <Table>
        <thead><tr><th>Received</th><th>Owner</th><th>Request</th><th>Property</th><th>Status</th><th>Email</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow colSpan={6} text="No owner enquiries." /> : null}
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap text-xs">{formatDateTimeIST(r.createdAt)}<br /><span className="font-mono text-muted">{r.reference}</span></td>
              <td><Link className="link font-semibold" href={`/admin/enquiries/seller/${r.id}`}>{r.ownerName}</Link><br /><span className="text-xs text-muted">{r.phone}</span></td>
              <td className="text-xs">{SELLER_ENQUIRY_TYPES[r.enquiryType as keyof typeof SELLER_ENQUIRY_TYPES] ?? r.enquiryType}</td>
              <td className="text-xs">{propertyTypeLabel(r.propertyType)}<br />{r.locality}, {r.city}</td>
              <td><StatusBadge status={r.status} /></td>
              <td><StatusBadge status={mail.get(r.id)?.status ?? "pending"} /></td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  } else {
    const T = schema.contactMessages;
    const conds: SQL[] = [];
    if (status) conds.push(eq(T.status, status));
    if (q) conds.push(or(ilike(T.name, p), ilike(T.email, p), ilike(T.reference, p))!);
    const rows = await db.select().from(T).where(conds.length ? and(...conds) : undefined).orderBy(desc(T.createdAt)).limit(200);
    const mail = await emailStatusFor(rows.map((r) => r.id));
    body = (
      <Table>
        <thead><tr><th>Received</th><th>From</th><th>Subject</th><th>Status</th><th>Email</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow colSpan={5} text="No messages." /> : null}
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap text-xs">{formatDateTimeIST(r.createdAt)}<br /><span className="font-mono text-muted">{r.reference}</span></td>
              <td><Link className="link font-semibold" href={`/admin/enquiries/contact/${r.id}`}>{r.name}</Link><br /><span className="text-xs text-muted">{r.email}</span></td>
              <td className="text-xs">{CONTACT_SUBJECTS[r.subject as keyof typeof CONTACT_SUBJECTS] ?? r.subject}</td>
              <td><StatusBadge status={r.status} /></td>
              <td><StatusBadge status={mail.get(r.id)?.status ?? "pending"} /></td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  }

  return (
    <>
      <PageHeader
        title="Enquiries & showings"
        description={<>Customer personal data — handle according to your Privacy Notice. Retention period: {settings.privacy.retentionDays} days.</>}
        actions={
          can(user.role, "enquiries:delete") ? (
            <form action={purgeEnquiriesAction}>
              <ConfirmButton message={`Permanently delete all enquiries older than ${settings.privacy.retentionDays} days?`}>Apply retention period now</ConfirmButton>
            </form>
          ) : null
        }
      />
      <Notice notice={sp.notice} error={sp.error} />
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Enquiry types">
        {TABS.map(([k, v]) => (
          <Link key={k} href={`/admin/enquiries?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`btn btn-sm ${tab === k ? "btn-dark" : "btn-outline"}`}>{v}</Link>
        ))}
      </nav>
      <form className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]" role="search">
        <input type="hidden" name="tab" value={tab} />
        <input name="q" defaultValue={q} className="field" placeholder="Search name, email, phone, reference" aria-label="Search enquiries" />
        <select name="status" defaultValue={status} className="field" aria-label="Status">
          <option value="">All statuses</option>
          {ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-dark" type="submit">Filter</button>
      </form>
      {body}
    </>
  );
}
