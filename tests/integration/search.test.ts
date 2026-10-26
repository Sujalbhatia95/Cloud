/**
 * Acceptance tests 5 & 8 (data side): search and filters run against the database; archived,
 * sold and draft listings never appear as active; demo listings disappear when demo mode is off.
 */
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { searchListings, getPublicListing, getCityStats } from "@/lib/listings/queries";
import { parseSearchParams } from "@/lib/listings/search-params";
import { contentHash, validateListingRow } from "@/lib/listings/validate";
import { DEMO_LISTINGS } from "../../scripts/seed";
import { db, resetDb } from "../support/db";

type Raw = Record<string, string>;
const base: Raw = {
  title: "Test property listing", transaction_type: "Sale", property_type: "Apartment", listing_status: "Active",
  locality: "Baner", city: "Pune", state: "Maharashtra", pincode: "411045", area_unit: "sqft", area_type: "Carpet",
};

async function insert(raw: Raw, opts: { demo?: boolean; daysAgo?: number } = {}) {
  const v = validateListingRow({ ...base, ...raw }, new Date(), { allowDemoIds: opts.demo });
  if (!v.listing) throw new Error(v.errors.join("; "));
  const created = new Date(Date.now() - (opts.daysAgo ?? 0) * 86_400_000);
  await db().insert(schema.listings).values({ ...v.listing, contentHash: contentHash(v.listing), isDemo: !!opts.demo, source: "test", createdAt: created, updatedAt: created });
}

const search = (params: Record<string, string>, preset = {}, includeDemo = false) => searchListings(parseSearchParams(params, preset), includeDemo);
const ids = (r: { items: { listingId: string }[] }) => r.items.map((i) => i.listingId);

beforeAll(async () => {
  await resetDb();
  await insert({ listing_id: "A1", price: "80 Lakh", bedrooms: "2", bathrooms: "2", area_value: "850", furnishing_status: "Unfurnished" }, { daysAgo: 5 });
  await insert({ listing_id: "A2", price: "1.5 Cr", bedrooms: "3", bathrooms: "3", area_value: "1400", furnishing_status: "Semi-furnished" }, { daysAgo: 1 });
  await insert({ listing_id: "A3", price: "2.5 Cr", bedrooms: "4", bathrooms: "4", area_value: "2200", city: "Mumbai", locality: "Bandra West", pincode: "400050", furnishing_status: "Fully furnished" }, { daysAgo: 3 });
  await insert({ listing_id: "A4", price: "1.2 Cr", bedrooms: "3", area_value: "1200", possession_status: "Under construction", rera_project_number: "P52100000000" }, { daysAgo: 2 });
  await insert({ listing_id: "R1", transaction_type: "Rent", price: "35000", bedrooms: "2", area_value: "800", furnishing_status: "Fully furnished", available_from: "01-01-2020" }, { daysAgo: 4 });
  await insert({ listing_id: "R2", transaction_type: "Rent", price: "90000", bedrooms: "3", area_value: "1500", available_from: "01-01-2099" }, { daysAgo: 6 });
  await insert({ listing_id: "C1", transaction_type: "Lease", property_type: "Office", price: "2 Lakh", area_value: "3000", city: "Noida", locality: "Sector 62", state: "UP", pincode: "201309" }, { daysAgo: 7 });
  await insert({ listing_id: "C2", property_type: "Shop", price: "60 Lakh", area_value: "400" }, { daysAgo: 8 });
  await insert({ listing_id: "P1", property_type: "Plot", price: "50 Lakh", area_value: "200", area_unit: "sqyd", area_type: "Plot" }, { daysAgo: 9 });
  await insert({ listing_id: "U1", price: "95 Lakh", bedrooms: "2", listing_status: "Under offer" }, { daysAgo: 1 });
  await insert({ listing_id: "X1", price: "70 Lakh", listing_status: "Archived" });
  await insert({ listing_id: "X2", price: "70 Lakh", listing_status: "Sold" });
  await insert({ listing_id: "X3", price: "70 Lakh", listing_status: "Draft" });
  await insert({ listing_id: "X4", transaction_type: "Rent", price: "20000", listing_status: "Rented" });
  for (const { daysAgo, ...raw } of DEMO_LISTINGS) await insert(raw as Raw, { demo: true, daysAgo });
});

describe("public search", () => {
  it("only shows active listings for the right transaction type", async () => {
    expect(ids(await search({}, { deal: "sale" })).sort()).toEqual(["A1", "A2", "A3", "A4", "C2", "P1"]);
    expect(ids(await search({}, { deal: "rent" })).sort()).toEqual(["C1", "R1", "R2"]);
    expect(ids(await search({}, { category: "commercial" })).sort()).toEqual(["C1", "C2"]);
    expect(ids(await search({ deal: "rent" }, { category: "commercial" }))).toEqual(["C1"]);
  });

  it("never returns archived, sold, rented or draft listings", async () => {
    const all = ids(await search({ availability: "include_under_offer" }));
    for (const hidden of ["X1", "X2", "X3", "X4"]) expect(all).not.toContain(hidden);
    expect(await getPublicListing("X1", false)).toBeNull();
    expect(await getPublicListing("X3", false)).toBeNull();
    expect((await getPublicListing("X2", false))?.listingStatus).toBe("sold"); // reachable by link, shown as unavailable
  });

  it("includes under-offer listings only when asked", async () => {
    expect(ids(await search({}, { deal: "sale" }))).not.toContain("U1");
    expect(ids(await search({ availability: "include_under_offer" }, { deal: "sale" }))).toContain("U1");
  });

  it("filters by location fields and free text", async () => {
    expect(ids(await search({ city: "mumbai" }))).toEqual(["A3"]);
    expect(ids(await search({ locality: "bandra" }))).toEqual(["A3"]);
    expect(ids(await search({ pincode: "201309" }))).toEqual(["C1"]);
    expect(ids(await search({ state: "Uttar Pradesh" }))).toEqual(["C1"]);
    expect(ids(await search({ q: "Sector 62 Noida" }))).toEqual(["C1"]);
    expect(ids(await search({ q: "a3" }))).toEqual(["A3"]);
  });

  it("combines price, bedrooms, bathrooms, area, type, furnishing and availability", async () => {
    expect(ids(await search({ minPrice: "10000000", maxPrice: "20000000" }, { deal: "sale" })).sort()).toEqual(["A2", "A4"]);
    expect(ids(await search({ beds: "3", baths: "3" }, { deal: "sale" })).sort()).toEqual(["A2", "A3"]);
    expect(ids(await search({ minArea: "1000", maxArea: "1500" }, { deal: "sale" })).sort()).toEqual(["A2", "A4"]);
    expect(ids(await search({ type: "residential_plot" }))).toEqual(["P1"]);
    expect(ids(await search({ furnishing: "fully_furnished" })).sort()).toEqual(["A3", "R1"]);
    expect(ids(await search({ availability: "under_construction" }))).toEqual(["A4"]);
    expect(ids(await search({ availability: "now" }, { deal: "rent" })).sort()).toEqual(["C1", "R1"]);
    expect(ids(await search({ beds: "2", maxPrice: "9000000", furnishing: "unfurnished" }, { deal: "sale" }))).toEqual(["A1"]);
  });

  it("sorts by newest, lowest price and highest price", async () => {
    expect(ids(await search({}, { deal: "sale" }))).toEqual(["A2", "A4", "A3", "A1", "C2", "P1"]);
    expect(ids(await search({ sort: "price_asc" }, { deal: "sale" }))).toEqual(["P1", "C2", "A1", "A4", "A2", "A3"]);
    expect(ids(await search({ sort: "price_desc" }, { deal: "sale" }))).toEqual(["A3", "A2", "A4", "A1", "C2", "P1"]);
  });

  it("paginates and reports totals", async () => {
    for (let i = 0; i < 20; i++) await insert({ listing_id: `B${i}`, price: `${50 + i} Lakh` });
    const p1 = await search({}, { deal: "sale" });
    expect(p1.total).toBe(26);
    expect(p1.pageCount).toBe(3);
    expect(p1.items).toHaveLength(12);
    const p3 = await search({ page: "3" }, { deal: "sale" });
    expect(p3.items).toHaveLength(2);
    const beyond = await search({ page: "99" }, { deal: "sale" });
    expect(beyond.page).toBe(3);
  });

  it("hides demo listings unless demo mode is on", async () => {
    expect(ids(await search({ q: "DEMO" }, {}, false))).toEqual([]);
    const withDemo = ids(await search({ q: "DEMO" }, {}, true));
    expect(withDemo.length).toBeGreaterThan(5);
    expect(withDemo).not.toContain("DEMO-111"); // archived demo listing
    expect(await getPublicListing("DEMO-101", false)).toBeNull();
    expect((await getPublicListing("DEMO-101", true))?.isDemo).toBe(true);
    expect((await getCityStats(false)).map((c) => c.city)).not.toContain("Vrindavan");
  });

  it("ignores malicious or malformed parameters", async () => {
    const f = parseSearchParams({ minPrice: "abc", beds: "-1", sort: "drop table", type: "x' or 1=1", q: "%' OR '1'='1" });
    expect(f).toMatchObject({ minPrice: null, beds: null, sort: "newest", type: null });
    const r = await searchListings(f, false);
    expect(r.total).toBe(0);
  });
});
