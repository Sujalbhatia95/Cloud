"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { audit, requireAction } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { destroyAllSessionsFor } from "@/lib/auth/session";
import { ROLES } from "@/lib/auth/roles";
import { AREA_TYPES, AREA_UNITS, PROPERTY_TYPES, type AreaUnit } from "@/lib/listings/constants";
import { parseInr } from "@/lib/listings/normalize";
import { randomToken } from "@/lib/security/crypto";

function tempPassword() {
  // 16 chars from a random token plus guaranteed character classes
  return `${randomToken(12).slice(0, 12)}-Ka7`;
}

export type TempPasswordState = { error?: string; email?: string; temp?: string; reset?: boolean };

/** The temporary password is returned in the action result (never in a URL) and shown once. */
export async function createUserAction(_prev: TempPasswordState, data: FormData): Promise<TempPasswordState> {
  const actor = await requireAction("users");
  const email = String(data.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const name = String(data.get("name") ?? "").trim().slice(0, 100);
  const role = String(data.get("role") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2 || !(role in ROLES)) return { error: "Enter a valid email, a name and a role." };
  const db = getDb();
  const [exists] = await db.select({ id: schema.adminUsers.id }).from(schema.adminUsers).where(eq(schema.adminUsers.email, email)).limit(1);
  if (exists) return { error: "An account with that email already exists." };
  const pw = tempPassword();
  const [u] = await db
    .insert(schema.adminUsers)
    .values({ email, name, role, passwordHash: await hashPassword(pw), mustChangePassword: true })
    .returning({ id: schema.adminUsers.id });
  await audit(actor, "user.created", "admin_user", u.id, { email, role });
  revalidatePath("/admin/users");
  return { email, temp: pw };
}

export async function resetUserPasswordAction(_prev: TempPasswordState, data: FormData): Promise<TempPasswordState> {
  const actor = await requireAction("users");
  const id = String(data.get("id") ?? "");
  const pw = tempPassword();
  const db = getDb();
  const [u] = await db
    .update(schema.adminUsers)
    .set({ passwordHash: await hashPassword(pw), mustChangePassword: true, failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(schema.adminUsers.id, id))
    .returning({ email: schema.adminUsers.email });
  if (!u) return { error: "User not found." };
  await destroyAllSessionsFor(id);
  await audit(actor, "user.password_reset", "admin_user", id);
  return { email: u.email, temp: pw, reset: true };
}

export async function updateUserAction(data: FormData) {
  const actor = await requireAction("users");
  const id = String(data.get("id") ?? "");
  const role = String(data.get("role") ?? "");
  const active = data.get("active") === "on";
  if (!(role in ROLES)) redirect("/admin/users?error=Invalid+role");
  const db = getDb();
  if (id === actor.id && (!active || role !== "admin")) redirect(`/admin/users?error=${encodeURIComponent("You cannot remove your own administrator access.")}`);
  const [{ admins }] = await db
    .select({ admins: sql<number>`count(*)::int` })
    .from(schema.adminUsers)
    .where(and(eq(schema.adminUsers.role, "admin"), eq(schema.adminUsers.isActive, true), ne(schema.adminUsers.id, id)));
  if (admins === 0 && (role !== "admin" || !active)) redirect(`/admin/users?error=${encodeURIComponent("At least one active administrator is required.")}`);
  await db.update(schema.adminUsers).set({ role, isActive: active, updatedAt: new Date() }).where(eq(schema.adminUsers.id, id));
  if (!active) await destroyAllSessionsFor(id);
  await audit(actor, "user.updated", "admin_user", id, { role, active });
  redirect("/admin/users?notice=Saved");
}

/* ---------------- Valuation comparables ---------------- */

export async function addComparableAction(data: FormData) {
  const actor = await requireAction("comparables");
  const g = (k: string, max = 200) => String(data.get(k) ?? "").trim().slice(0, max);
  const city = g("city", 80);
  const locality = g("locality", 100);
  const propertyType = g("propertyType", 40);
  const areaType = g("areaType", 20);
  const areaUnit = (g("areaUnit", 10) || "sqft") as AreaUnit;
  const areaValue = Number(g("areaValue", 20).replace(/,/g, ""));
  const price = parseInr(g("price", 40), "price");
  const date = g("transactionDate", 10);
  const source = g("source", 300);
  const fail = (m: string) => redirect(`/admin/comparables?error=${encodeURIComponent(m)}`);
  if (city.length < 2 || locality.length < 2) fail("City and locality are required.");
  if (!(propertyType in PROPERTY_TYPES)) fail("Choose a property type.");
  if (!(areaType in AREA_TYPES)) fail("Choose the area type.");
  if (!(areaUnit in AREA_UNITS) || !(areaValue > 0)) fail("Enter a positive area.");
  if (!price.ok || price.value === null) fail(price.ok ? "Enter the transaction price." : price.error);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > new Date().toISOString().slice(0, 10)) fail("Enter the transaction date (not in the future).");
  if (source.length < 5) fail("Record the source of this data (e.g. registered sale deed no., our own closed deal).");
  await getDb().insert(schema.marketComparables).values({
    city,
    locality,
    propertyType,
    areaType,
    areaSqft: areaValue * AREA_UNITS[areaUnit].toSqft,
    price: (price as { ok: true; value: number }).value,
    transactionDate: date,
    source,
    notes: g("notes", 500) || null,
    createdBy: actor.email,
  });
  await audit(actor, "comparable.added", "market_comparable", undefined, { city, locality, propertyType });
  redirect("/admin/comparables?notice=Comparable+added");
}

export async function deleteComparableAction(data: FormData) {
  const actor = await requireAction("comparables");
  const id = String(data.get("id") ?? "");
  await getDb().delete(schema.marketComparables).where(eq(schema.marketComparables.id, id));
  await audit(actor, "comparable.deleted", "market_comparable", id);
  redirect("/admin/comparables?notice=Deleted");
}
