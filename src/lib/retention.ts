import "server-only";
import { lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSettings } from "@/lib/settings";

/** Deletes enquiries (and their notification emails) older than the configured retention period. */
export async function purgeExpiredEnquiries(): Promise<{ showings: number; sellers: number; contacts: number; emails: number; cutoff: string }> {
  const s = await getSettings();
  const cutoff = new Date(Date.now() - s.privacy.retentionDays * 86_400_000);
  const db = getDb();
  return db.transaction(async (tx) => {
    const showings = await tx.delete(schema.showingRequests).where(lt(schema.showingRequests.updatedAt, cutoff)).returning({ id: schema.showingRequests.id });
    const sellers = await tx.delete(schema.sellerEnquiries).where(lt(schema.sellerEnquiries.updatedAt, cutoff)).returning({ id: schema.sellerEnquiries.id });
    const contacts = await tx.delete(schema.contactMessages).where(lt(schema.contactMessages.updatedAt, cutoff)).returning({ id: schema.contactMessages.id });
    const emails = await tx
      .delete(schema.emailOutbox)
      .where(sql`${schema.emailOutbox.createdAt} < ${cutoff} or (${schema.emailOutbox.relatedId} is not null and ${schema.emailOutbox.kind} <> 'test' and not exists (
        select 1 from showing_requests where id = ${schema.emailOutbox.relatedId}
        union all select 1 from seller_enquiries where id = ${schema.emailOutbox.relatedId}
        union all select 1 from contact_messages where id = ${schema.emailOutbox.relatedId}))`)
      .returning({ id: schema.emailOutbox.id });
    await tx.delete(schema.adminSessions).where(lt(schema.adminSessions.expiresAt, new Date()));
    await tx.execute(sql`delete from rate_limits where window_start < now() - interval '2 days'`);
    return { showings: showings.length, sellers: sellers.length, contacts: contacts.length, emails: emails.length, cutoff: cutoff.toISOString() };
  });
}
