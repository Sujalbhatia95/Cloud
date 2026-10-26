import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ConfirmButton, PendingButton } from "@/components/admin/ConfirmButton";
import { Card, Notice, PageHeader, StatusBadge } from "@/components/admin/ui";
import { getDb, schema } from "@/db";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/roles";
import { ENQUIRY_STATUSES } from "@/lib/enquiry-statuses";
import { CONTACT_SUBJECTS, FLEXIBILITY, SELLER_ENQUIRY_TYPES, SHOWING_TIMES } from "@/lib/forms/schemas";
import { AREA_UNITS, type AreaUnit } from "@/lib/listings/constants";
import { formatDateIST, formatDateTimeIST, formatInrFull, propertyTypeLabel } from "@/lib/listings/format";
import { deleteEnquiryAction, retryEmailAction, updateEnquiryAction } from "../../../../actions/enquiries";

export default async function EnquiryDetail({ params, searchParams }: PageProps<"/admin/enquiries/[kind]/[id]">) {
  const user = await requirePage("enquiries");
  const { kind, id } = await params;
  const sp = await searchParams;
  if (!["showing", "seller", "contact"].includes(kind) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = getDb();

  let title = "";
  let rows: [string, React.ReactNode][] = [];
  let status = "new";
  let notes = "";
  let reference = "";
  let createdAt = new Date();
  let consent: { at: Date; version: string; marketing: boolean } | null = null;

  if (kind === "showing") {
    const [r] = await db.select().from(schema.showingRequests).where(eq(schema.showingRequests.id, id)).limit(1);
    if (!r) notFound();
    title = `Showing request from ${r.name}`;
    ({ status, reference, createdAt } = r);
    notes = r.adminNotes ?? "";
    consent = { at: r.consentAt, version: r.consentVersion, marketing: r.marketingConsent };
    rows = [
      ["Name", r.name],
      ["Email", <a key="e" className="link" href={`mailto:${r.email}`}>{r.email}</a>],
      ["Phone", <a key="p" className="link" href={`tel:${r.phone.replace(/\s/g, "")}`}>{r.phone}</a>],
      ["Property", <a key="u" className="link" href={r.propertyUrl} target="_blank" rel="noreferrer">{r.propertyTitle}</a>],
      ["Listing ID", <span key="i" className="font-mono">{r.listingId}</span>],
      ["Preferred date", formatDateIST(r.preferredDate)],
      ["Preferred time", SHOWING_TIMES[r.preferredTime as keyof typeof SHOWING_TIMES] ?? r.preferredTime],
      ["Flexibility", FLEXIBILITY[r.flexibility as keyof typeof FLEXIBILITY] ?? r.flexibility],
      ["Message", r.message ?? "—"],
    ];
  } else if (kind === "seller") {
    const [r] = await db.select().from(schema.sellerEnquiries).where(eq(schema.sellerEnquiries.id, id)).limit(1);
    if (!r) notFound();
    title = `Owner enquiry from ${r.ownerName}`;
    ({ status, reference, createdAt } = r);
    notes = r.adminNotes ?? "";
    consent = { at: r.consentAt, version: r.consentVersion, marketing: r.marketingConsent };
    const snap = r.valuationSnapshot as { low?: number; high?: number; basis?: string } | null;
    rows = [
      ["Request", SELLER_ENQUIRY_TYPES[r.enquiryType as keyof typeof SELLER_ENQUIRY_TYPES] ?? r.enquiryType],
      ["Owner", r.ownerName],
      ["Email", <a key="e" className="link" href={`mailto:${r.email}`}>{r.email}</a>],
      ["Phone", <a key="p" className="link" href={`tel:${r.phone.replace(/\s/g, "")}`}>{r.phone}</a>],
      ["Preferred contact", r.preferredContact ?? "—"],
      ["Address", [r.addressLine, r.locality, r.city, r.state, r.pincode].filter(Boolean).join(", ")],
      ["Property type", propertyTypeLabel(r.propertyType)],
      ["Area", r.areaValue ? `${r.areaValue} ${AREA_UNITS[(r.areaUnit ?? "sqft") as AreaUnit]?.label ?? ""} ${r.areaType ? `(${r.areaType.replace(/_/g, " ")})` : ""}` : "—"],
      ["Bedrooms", r.bedrooms ?? "—"],
      ["Expected price", r.expectedPrice ? formatInrFull(r.expectedPrice) : "—"],
      ["Supporting information", r.details ?? "—"],
      ["Website estimate shown", snap?.low && snap?.high ? `${formatInrFull(snap.low)} – ${formatInrFull(snap.high)} (${snap.basis ?? ""})` : "—"],
    ];
  } else {
    const [r] = await db.select().from(schema.contactMessages).where(eq(schema.contactMessages.id, id)).limit(1);
    if (!r) notFound();
    title = `Message from ${r.name}`;
    ({ status, reference, createdAt } = r);
    notes = r.adminNotes ?? "";
    consent = { at: r.consentAt, version: r.consentVersion, marketing: r.marketingConsent };
    rows = [
      ["Name", r.name],
      ["Email", <a key="e" className="link" href={`mailto:${r.email}`}>{r.email}</a>],
      ["Phone", r.phone ?? "—"],
      ["Subject", CONTACT_SUBJECTS[r.subject as keyof typeof CONTACT_SUBJECTS] ?? r.subject],
      ["Message", r.message],
    ];
  }

  const emails = await db.select().from(schema.emailOutbox).where(eq(schema.emailOutbox.relatedId, id)).orderBy(asc(schema.emailOutbox.createdAt));
  const tabKey = kind === "showing" ? "showings" : kind === "seller" ? "sellers" : "contacts";

  return (
    <>
      <PageHeader
        title={title}
        description={<>Reference <span className="font-mono">{reference}</span> · received {formatDateTimeIST(createdAt)} · <StatusBadge status={status} /></>}
        actions={<Link href={`/admin/enquiries?tab=${tabKey}`} className="btn btn-outline btn-sm">Back to list</Link>}
      />
      <Notice notice={sp.notice} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Details">
          <dl className="divide-y divide-stone text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[180px_1fr]">
                <dt className="text-muted">{k}</dt>
                <dd className="whitespace-pre-wrap break-words">{v}</dd>
              </div>
            ))}
          </dl>
          {consent ? (
            <p className="mt-4 text-xs text-muted">
              Consent given {formatDateTimeIST(consent.at)} (notice version {consent.version}). Marketing updates: {consent.marketing ? "yes" : "no"}.
            </p>
          ) : null}
        </Card>
        <div className="space-y-6">
          <Card title="Follow-up">
            <form action={updateEnquiryAction} className="space-y-3">
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="id" value={id} />
              <label className="block">
                <span className="field-label">Status</span>
                <select name="status" defaultValue={status} className="field">
                  {ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="field-label">Internal notes</span>
                <textarea name="adminNotes" defaultValue={notes} className="field" rows={4} maxLength={4000} />
              </label>
              <PendingButton>Save</PendingButton>
            </form>
          </Card>
          <Card title="Notification email">
            {emails.length === 0 ? <p className="text-sm text-muted">No email recorded.</p> : null}
            <ul className="space-y-3 text-sm">
              {emails.map((m) => (
                <li key={m.id} className="border border-stone p-3">
                  <p><StatusBadge status={m.status} /> to {m.toAddress}</p>
                  <p className="mt-1 text-xs text-muted">
                    {m.attempts} attempt(s){m.provider ? ` via ${m.provider}` : ""}{m.sentAt ? ` · sent ${formatDateTimeIST(m.sentAt)}` : ""}
                  </p>
                  {m.lastError ? <p className="mt-1 text-xs text-danger">{m.lastError}</p> : null}
                  {m.status === "failed" || m.status === "pending" ? (
                    <form action={retryEmailAction} className="mt-2">
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="back" value={`/admin/enquiries/${kind}/${id}`} />
                      <PendingButton className="btn btn-outline btn-sm" pendingText="Sending…">Retry now</PendingButton>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
          {can(user.role, "enquiries:delete") ? (
            <Card title="Erase">
              <p className="mb-3 text-sm text-muted">Use this when the person asks for their data to be deleted, or it is no longer needed.</p>
              <form action={deleteEnquiryAction}>
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="id" value={id} />
                <ConfirmButton message="Permanently delete this enquiry and its notification emails? This cannot be undone." className="btn btn-danger btn-sm">
                  Delete permanently
                </ConfirmButton>
              </form>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
