"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { AuthError, audit, requireAction } from "@/lib/auth/guards";
import { LISTING_STATUSES } from "@/lib/listings/constants";
import { LISTING_FIELDS, type ListingFieldKey } from "@/lib/listings/fields";
import { contentHash, validateListingRow } from "@/lib/listings/validate";

export type ListingFormState = { errors?: string[]; warnings?: string[] };

function rawFromForm(data: FormData): Partial<Record<ListingFieldKey, string>> {
  const raw: Partial<Record<ListingFieldKey, string>> = {};
  for (const f of LISTING_FIELDS) {
    const v = data.get(f.key);
    if (typeof v === "string") raw[f.key] = v;
  }
  return raw;
}

export async function saveListingAction(_prev: ListingFormState, data: FormData): Promise<ListingFormState> {
  let user;
  try {
    user = await requireAction("listings:write");
  } catch (e) {
    return { errors: [e instanceof AuthError ? e.message : "Not allowed."] };
  }
  const id = String(data.get("id") ?? "");
  const raw = rawFromForm(data);
  const db = getDb();
  let existing: typeof schema.listings.$inferSelect | undefined;
  if (id) {
    [existing] = await db.select().from(schema.listings).where(eq(schema.listings.id, id)).limit(1);
    if (!existing) return { errors: ["Listing not found."] };
    raw.listing_id = existing.listingId; // the business key never changes
  }
  const v = validateListingRow(raw, new Date(), { allowDemoIds: !!existing?.isDemo });
  if (!v.listing) return { errors: v.errors, warnings: v.warnings };
  const listing = { ...v.listing, listingId: existing ? existing.listingId : v.listing.listingId };
  const hash = contentHash(listing);
  const now = new Date();
  if (existing) {
    await db
      .update(schema.listings)
      .set({ ...listing, contentHash: hash, sourceUpdatedAt: now, source: "admin", updatedAt: now })
      .where(eq(schema.listings.id, existing.id));
    await audit(user, "listing.updated", "listing", listing.listingId);
  } else {
    const [dup] = await db.select({ id: schema.listings.id }).from(schema.listings).where(eq(schema.listings.listingId, listing.listingId)).limit(1);
    if (dup) return { errors: [`A listing with ID ${listing.listingId} already exists. Edit that listing instead.`], warnings: v.warnings };
    await db.insert(schema.listings).values({ ...listing, contentHash: hash, sourceUpdatedAt: now, source: "admin", isDemo: false, createdAt: now, updatedAt: now });
    await audit(user, "listing.created", "listing", listing.listingId);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/listings?notice=${encodeURIComponent(`Saved ${listing.listingId}.${v.warnings.length ? ` ${v.warnings.length} warning(s): ${v.warnings.join("; ")}` : ""}`)}`);
}

export async function setListingStatusAction(data: FormData) {
  const user = await requireAction("listings:write");
  const id = String(data.get("id") ?? "");
  const status = String(data.get("status") ?? "");
  const back = String(data.get("back") ?? "/admin/listings");
  if (!(status in LISTING_STATUSES)) redirect(`${back}${back.includes("?") ? "&" : "?"}error=Invalid+status`);
  const db = getDb();
  const [row] = await db.select().from(schema.listings).where(eq(schema.listings.id, id)).limit(1);
  if (!row) redirect(`/admin/listings?error=Listing+not+found`);
  const next = { ...row, listingStatus: status };
  await db
    .update(schema.listings)
    .set({ listingStatus: status, contentHash: contentHash(next as never), updatedAt: new Date() })
    .where(eq(schema.listings.id, id));
  await audit(user, "listing.status_changed", "listing", row.listingId, { from: row.listingStatus, to: status });
  revalidatePath("/", "layout");
  redirect(safeBack(back, `${row.listingId} is now ${LISTING_STATUSES[status as keyof typeof LISTING_STATUSES]}.`));
}

export async function toggleFeaturedAction(data: FormData) {
  const user = await requireAction("listings:write");
  const id = String(data.get("id") ?? "");
  const back = String(data.get("back") ?? "/admin/listings");
  const db = getDb();
  const [row] = await db.select().from(schema.listings).where(eq(schema.listings.id, id)).limit(1);
  if (!row) redirect(`/admin/listings?error=Listing+not+found`);
  const next = { ...row, featured: !row.featured };
  await db.update(schema.listings).set({ featured: !row.featured, contentHash: contentHash(next as never), updatedAt: new Date() }).where(eq(schema.listings.id, id));
  await audit(user, "listing.featured_toggled", "listing", row.listingId, { featured: !row.featured });
  revalidatePath("/", "layout");
  redirect(safeBack(back, `${row.listingId} ${!row.featured ? "is now featured" : "is no longer featured"}.`));
}

export async function deleteListingAction(data: FormData) {
  const user = await requireAction("listings:delete");
  const id = String(data.get("id") ?? "");
  const db = getDb();
  const [row] = await db.delete(schema.listings).where(and(eq(schema.listings.id, id))).returning({ listingId: schema.listings.listingId });
  if (row) await audit(user, "listing.deleted", "listing", row.listingId);
  revalidatePath("/", "layout");
  redirect(`/admin/listings?notice=${encodeURIComponent(row ? `Deleted ${row.listingId}.` : "Nothing deleted.")}`);
}

function safeBack(back: string, notice: string) {
  const base = back.startsWith("/admin") ? back : "/admin/listings";
  const url = new URL(base, "http://x");
  url.searchParams.delete("notice");
  url.searchParams.delete("error");
  url.searchParams.set("notice", notice);
  return `${url.pathname}${url.search}`;
}
