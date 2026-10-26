import "server-only";
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { sendEmail, type EmailMessage } from "./provider";

const O = schema.emailOutbox;
const MAX_AUTO_ATTEMPTS = 6;
const BACKOFF_MINUTES = [5, 15, 60, 180, 720, 1440];

/**
 * Every notification is first written to the outbox (so it can never be lost), then sent.
 * Failed deliveries stay in the outbox with the error, are retried automatically by the
 * cron endpoint, and can be retried manually from Admin → Emails.
 */
export async function queueAndSend(kind: string, relatedId: string | null, msg: EmailMessage) {
  const [row] = await getDb()
    .insert(O)
    .values({ kind, relatedId, toAddress: msg.to, replyTo: msg.replyTo ?? null, subject: msg.subject, html: msg.html, textBody: msg.text, status: "pending" })
    .returning({ id: O.id });
  return deliver(row.id);
}

/** Attempts delivery of one outbox message. Uses a row lock so two workers never send the same email. */
export async function deliver(id: string): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const claimed = await db
    .update(O)
    .set({ status: "sending", updatedAt: new Date() })
    .where(and(eq(O.id, id), inArray(O.status, ["pending", "failed"])))
    .returning();
  const row = claimed[0];
  if (!row) return { ok: false, error: "Message is already sent or being sent." };

  const result = await sendEmail({ to: row.toAddress, subject: row.subject, html: row.html, text: row.textBody, replyTo: row.replyTo });
  const attempts = row.attempts + 1;
  if (result.ok) {
    await db
      .update(O)
      .set({ status: "sent", attempts, provider: result.provider, providerMessageId: result.id, lastError: null, sentAt: new Date(), nextAttemptAt: null, updatedAt: new Date() })
      .where(eq(O.id, id));
    return { ok: true };
  }
  const delay = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)];
  await db
    .update(O)
    .set({
      status: "failed",
      attempts,
      provider: result.provider,
      lastError: result.error,
      nextAttemptAt: result.retryable && attempts < MAX_AUTO_ATTEMPTS ? new Date(Date.now() + delay * 60_000) : null,
      updatedAt: new Date(),
    })
    .where(eq(O.id, id));
  console.error(`[email] delivery failed (${result.provider}) for outbox ${id}: ${result.error}`);
  return { ok: false, error: result.error };
}

/** Cron worker: retries failed messages whose back-off has elapsed. */
export async function processDueEmails(limit = 20) {
  const db = getDb();
  // Recover messages stuck in "sending" (e.g. the function was killed mid-send) after 10 minutes.
  await db
    .update(O)
    .set({ status: "failed", lastError: sql`coalesce(${O.lastError}, 'Interrupted while sending')`, nextAttemptAt: new Date() })
    .where(and(eq(O.status, "sending"), lte(O.updatedAt, new Date(Date.now() - 10 * 60_000))));
  const due = await db
    .select({ id: O.id })
    .from(O)
    .where(and(inArray(O.status, ["failed", "pending"]), lte(O.nextAttemptAt, new Date())))
    .orderBy(asc(O.nextAttemptAt))
    .limit(limit);
  let sent = 0;
  for (const d of due) if ((await deliver(d.id)).ok) sent++;
  return { attempted: due.length, sent };
}

export async function emailStatusFor(relatedIds: string[]) {
  if (relatedIds.length === 0) return new Map<string, { status: string; lastError: string | null }>();
  const rows = await getDb()
    .select({ relatedId: O.relatedId, status: O.status, lastError: O.lastError, createdAt: O.createdAt })
    .from(O)
    .where(inArray(O.relatedId, relatedIds))
    .orderBy(asc(O.createdAt));
  const map = new Map<string, { status: string; lastError: string | null }>();
  for (const r of rows) if (r.relatedId) map.set(r.relatedId, { status: r.status, lastError: r.lastError });
  return map;
}
