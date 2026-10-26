"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { audit, requireAction } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { deliver, queueAndSend } from "@/lib/email/outbox";
import { testEmail } from "@/lib/email/templates";
import { purgeExpiredEnquiries } from "@/lib/retention";
import { ENQUIRY_STATUSES } from "@/lib/enquiry-statuses";


const TABLES = {
  showing: schema.showingRequests,
  seller: schema.sellerEnquiries,
  contact: schema.contactMessages,
} as const;
type Kind = keyof typeof TABLES;

function kindOf(v: unknown): Kind {
  const k = String(v);
  if (k === "showing" || k === "seller" || k === "contact") return k;
  throw new Error("Invalid enquiry type");
}

export async function updateEnquiryAction(data: FormData) {
  const user = await requireAction("enquiries");
  const kind = kindOf(data.get("kind"));
  const id = String(data.get("id") ?? "");
  const status = String(data.get("status") ?? "");
  const notes = String(data.get("adminNotes") ?? "").slice(0, 4000);
  if (!(ENQUIRY_STATUSES as readonly string[]).includes(status)) redirect(`/admin/enquiries/${kind}/${id}?error=Invalid+status`);
  const table = TABLES[kind];
  await getDb().update(table).set({ status, adminNotes: notes || null, updatedAt: new Date() }).where(eq(table.id, id));
  await audit(user, "enquiry.updated", kind, id, { status });
  redirect(`/admin/enquiries/${kind}/${id}?notice=Saved`);
}

/** Erasure: permanently removes an enquiry and its notification emails (e.g. on a data principal's request). */
export async function deleteEnquiryAction(data: FormData) {
  const user = await requireAction("enquiries:delete");
  const kind = kindOf(data.get("kind"));
  const id = String(data.get("id") ?? "");
  const table = TABLES[kind];
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(table).where(eq(table.id, id));
    await tx.delete(schema.emailOutbox).where(eq(schema.emailOutbox.relatedId, id));
  });
  await audit(user, "enquiry.deleted", kind, id);
  redirect(`/admin/enquiries?tab=${kind === "showing" ? "showings" : kind === "seller" ? "sellers" : "contacts"}&notice=${encodeURIComponent("Enquiry and its emails were permanently deleted.")}`);
}

export async function retryEmailAction(data: FormData) {
  const user = await requireAction("emails");
  const id = String(data.get("id") ?? "");
  const back = String(data.get("back") ?? "/admin/emails");
  const res = await deliver(id);
  await audit(user, "email.retry", "email_outbox", id, { ok: res.ok });
  const target = back.startsWith("/admin") ? back : "/admin/emails";
  const sep = target.includes("?") ? "&" : "?";
  redirect(`${target}${sep}${res.ok ? `notice=${encodeURIComponent("Email sent.")}` : `error=${encodeURIComponent(`Still failing: ${res.error ?? "unknown error"}`)}`}`);
}

export async function sendTestEmailAction() {
  const user = await requireAction("emails");
  const mail = testEmail(env.siteUrl, user.email);
  const res = await queueAndSend("test", null, { to: env.notifyEmail, ...mail });
  await audit(user, "email.test", "email_outbox", undefined, { ok: res.ok });
  redirect(
    `/admin/emails?${res.ok ? `notice=${encodeURIComponent(`Test email accepted for delivery to ${env.notifyEmail}. Check that inbox (and spam folder).`)}` : `error=${encodeURIComponent(`Test email failed: ${res.error}`)}`}`,
  );
}

export async function purgeEnquiriesAction() {
  const user = await requireAction("enquiries:delete");
  const r = await purgeExpiredEnquiries();
  await audit(user, "retention.purge", undefined, undefined, r);
  redirect(
    `/admin/enquiries?notice=${encodeURIComponent(`Retention clean-up: deleted ${r.showings} showing request(s), ${r.sellers} owner enquiry(ies), ${r.contacts} message(s) and ${r.emails} email record(s) older than the retention period.`)}`,
  );
}
