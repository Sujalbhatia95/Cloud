import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export const db = () => getDb();

export async function resetDb() {
  await getDb().execute(sql`truncate table
    listings, import_batches, mapping_profiles, showing_requests, seller_enquiries, contact_messages,
    email_outbox, audit_log, admin_sessions, admin_users, rate_limits, site_settings, content_pages,
    compliance_items, market_comparables restart identity cascade`);
}

export async function createTestAdmin(role: "admin" | "editor" | "agent" = "admin") {
  const [u] = await getDb().execute<{ id: string }>(sql`insert into admin_users (email, name, password_hash, role, must_change_password)
    values (${`${role}-${Math.random().toString(36).slice(2)}@test.local`}, 'Test', 'x', ${role}, false) returning id`).then((r) => r.rows);
  return { id: u.id, email: `${role}@test.local` };
}
