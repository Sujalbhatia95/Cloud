import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PAGE_SIZE, PUBLIC_VISIBLE_STATUSES, type ListingStatus } from "./constants";
import type { SearchFilters } from "./search-params";
import { atRequestTime } from "@/lib/request-time";

const L = schema.listings;
export type PublicListing = typeof L.$inferSelect;

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const todayIst = sql`(now() at time zone 'Asia/Kolkata')::date`;

/** Conditions every public query must include: status gate + demo gate. */
function visibility(statuses: ListingStatus[], includeDemo: boolean): SQL {
  const conds: SQL[] = [inArray(L.listingStatus, statuses)];
  if (!includeDemo) conds.push(eq(L.isDemo, false));
  return and(...conds)!;
}

export function buildSearchWhere(f: SearchFilters, includeDemo: boolean): SQL {
  const statuses: ListingStatus[] = f.availability === "include_under_offer" ? ["active", "under_offer"] : ["active"];
  const conds: SQL[] = [visibility(statuses, includeDemo)];

  if (f.deal) conds.push(eq(L.transactionType, f.deal));
  if (f.category) conds.push(eq(L.category, f.category));
  if (f.type) conds.push(eq(L.propertyType, f.type));

  if (f.q) {
    // Every word must match at least one location / title / ID field.
    for (const word of f.q.split(/[\s,]+/).filter(Boolean).slice(0, 6)) {
      const p = `%${escapeLike(word)}%`;
      conds.push(
        or(
          ilike(L.city, p),
          ilike(L.locality, p),
          ilike(L.state, p),
          ilike(L.pincode, p),
          ilike(L.title, p),
          ilike(L.listingId, p),
        )!,
      );
    }
  }
  if (f.city) conds.push(ilike(L.city, escapeLike(f.city)));
  if (f.locality) conds.push(ilike(L.locality, `%${escapeLike(f.locality)}%`));
  if (f.state) conds.push(ilike(L.state, escapeLike(f.state)));
  if (f.pincode) conds.push(f.pincode.length === 6 ? eq(L.pincode, f.pincode) : ilike(L.pincode, `${f.pincode}%`));

  if (f.minPrice) conds.push(gte(L.price, f.minPrice));
  if (f.maxPrice) conds.push(lte(L.price, f.maxPrice));
  if (f.beds) conds.push(gte(L.bedrooms, f.beds));
  if (f.baths) conds.push(gte(L.bathrooms, f.baths));
  if (f.minArea) conds.push(gte(L.areaSqft, f.minArea));
  if (f.maxArea) conds.push(lte(L.areaSqft, f.maxArea));
  if (f.furnishing) conds.push(eq(L.furnishingStatus, f.furnishing));

  if (f.availability === "now") {
    conds.push(or(isNull(L.possessionStatus), eq(L.possessionStatus, "ready_to_move"))!);
    conds.push(or(isNull(L.availableFrom), lte(L.availableFrom, todayIst))!);
  } else if (f.availability === "under_construction") {
    conds.push(eq(L.possessionStatus, "under_construction"));
  }
  return and(...conds)!;
}

function orderFor(sort: SearchFilters["sort"]) {
  switch (sort) {
    case "price_asc":
      return [sql`${L.price} asc nulls last`, desc(L.createdAt), asc(L.id)];
    case "price_desc":
      return [sql`${L.price} desc nulls last`, desc(L.createdAt), asc(L.id)];
    default:
      return [desc(L.createdAt), asc(L.id)];
  }
}

export async function searchListings(f: SearchFilters, includeDemo: boolean) {
  await atRequestTime();
  const db = getDb();
  const where = buildSearchWhere(f, includeDemo);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(L).where(where);
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const page = Math.min(f.page, pageCount);
  const items = await db
    .select()
    .from(L)
    .where(where)
    .orderBy(...orderFor(f.sort))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  return { items, total: count, page, pageCount };
}

export async function getFeaturedListings(includeDemo: boolean, limit = 6) {
  await atRequestTime();
  return getDb()
    .select()
    .from(L)
    .where(and(visibility(["active"], includeDemo), eq(L.featured, true)))
    .orderBy(desc(L.updatedAt), asc(L.id))
    .limit(limit);
}

export async function getRecentListings(includeDemo: boolean, limit = 8) {
  await atRequestTime();
  return getDb()
    .select()
    .from(L)
    .where(visibility(["active"], includeDemo))
    .orderBy(desc(L.createdAt), asc(L.id))
    .limit(limit);
}

export type CityStat = { city: string; state: string; count: number; image: string | null };

/** Location discovery: cities with active listings, most listings first. */
export async function getCityStats(includeDemo: boolean, limit = 8): Promise<CityStat[]> {
  await atRequestTime();
  const rows = await getDb()
    .select({
      city: L.city,
      state: sql<string>`min(${L.state})`,
      count: sql<number>`count(*)::int`,
      image: sql<string | null>`(array_agg(${L.imageUrls}[1] order by ${L.featured} desc, ${L.createdAt} desc) filter (where cardinality(${L.imageUrls}) > 0))[1]`,
    })
    .from(L)
    .where(visibility(["active"], includeDemo))
    .groupBy(L.city)
    .orderBy(desc(sql`count(*)`), asc(L.city))
    .limit(limit);
  return rows;
}

export async function getLocalityStats(includeDemo: boolean, limit = 12) {
  await atRequestTime();
  return getDb()
    .select({ locality: L.locality, city: L.city, count: sql<number>`count(*)::int` })
    .from(L)
    .where(visibility(["active"], includeDemo))
    .groupBy(L.locality, L.city)
    .orderBy(desc(sql`count(*)`), asc(L.locality))
    .limit(limit);
}

/** Distinct cities / localities for search suggestions. */
export async function getLocationSuggestions(includeDemo: boolean) {
  await atRequestTime();
  const rows = await getDb()
    .selectDistinct({ city: L.city, locality: L.locality, state: L.state })
    .from(L)
    .where(visibility(["active", "under_offer"], includeDemo))
    .limit(500);
  const cities = Array.from(new Set(rows.map((r) => r.city))).sort();
  const localities = Array.from(new Set(rows.map((r) => `${r.locality}, ${r.city}`))).sort();
  const states = Array.from(new Set(rows.map((r) => r.state))).sort();
  return { cities, localities, states };
}

/** Listing for a public detail page. Archived / draft listings (and demo listings outside demo mode) are not returned. */
/** Deduplicated per request (the property page and its metadata both need it). */
export const getPublicListing = cache(async (listingId: string, includeDemo: boolean) => {
  await atRequestTime();
  const [row] = await getDb()
    .select()
    .from(L)
    .where(and(eq(L.listingId, listingId.toUpperCase()), visibility(PUBLIC_VISIBLE_STATUSES, includeDemo)))
    .limit(1);
  return row ?? null;
});

export async function getSimilarListings(l: PublicListing, includeDemo: boolean, limit = 3) {
  await atRequestTime();
  return getDb()
    .select()
    .from(L)
    .where(
      and(
        visibility(["active"], includeDemo),
        ne(L.id, l.id),
        eq(L.transactionType, l.transactionType),
        or(ilike(L.city, escapeLike(l.city)), eq(L.propertyType, l.propertyType)),
      ),
    )
    .orderBy(sql`(lower(${L.city}) = lower(${l.city}))::int desc`, desc(L.createdAt))
    .limit(limit);
}

export async function getListingsForSitemap(includeDemo: boolean) {
  await atRequestTime();
  return getDb()
    .select({ listingId: L.listingId, slug: L.slug, updatedAt: L.updatedAt, isDemo: L.isDemo })
    .from(L)
    .where(visibility(["active", "under_offer"], includeDemo))
    .orderBy(desc(L.updatedAt))
    .limit(45_000);
}
