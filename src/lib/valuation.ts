import "server-only";
import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { AREA_UNITS, PROPERTY_TYPES, type AreaType, type AreaUnit, type PropertyType } from "@/lib/listings/constants";

/**
 * Property estimate calculator.
 *  1. Verified comparables — sale transactions entered by staff (Admin → Valuation data), with a source.
 *  2. Otherwise, asking prices of real (non-demo) listings on this website — clearly labelled as asking prices.
 *  3. Otherwise, an illustrative calculation from a rate the visitor enters themselves.
 * Demo listings are never used. No market statistics are invented.
 */
export type ValuationInput = {
  city: string;
  locality?: string;
  propertyType: string;
  transactionType?: "sale" | "rent";
  areaValue: number;
  areaUnit: string;
  areaType?: string | null;
  userRatePerSqft?: number | null;
};

export type ValuationMethod = "verified_comparables" | "listing_asking_prices" | "user_rate" | "insufficient_data";

export type ValuationResult =
  | { ok: false; error: string }
  | {
      ok: true;
      method: ValuationMethod;
      transactionType: "sale" | "rent";
      areaSqft: number;
      low: number | null;
      mid: number | null;
      high: number | null;
      rate: { low: number; mid: number; high: number } | null;
      sampleSize: number;
      scope: string;
      basis: string;
      explanation: string;
    };

const MIN_SAMPLE = 3;

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export async function estimateValue(input: ValuationInput): Promise<ValuationResult> {
  const city = String(input.city ?? "").trim().slice(0, 80);
  const locality = String(input.locality ?? "").trim().slice(0, 100);
  const tx = input.transactionType === "rent" ? "rent" : "sale";
  if (city.length < 2) return { ok: false, error: "Enter the city." };
  if (!(input.propertyType in PROPERTY_TYPES)) return { ok: false, error: "Choose a property type." };
  if (!(input.areaUnit in AREA_UNITS)) return { ok: false, error: "Choose an area unit." };
  const areaValue = Number(input.areaValue);
  if (!Number.isFinite(areaValue) || areaValue <= 0) return { ok: false, error: "Enter the area as a positive number." };
  const areaSqft = areaValue * AREA_UNITS[input.areaUnit as AreaUnit].toSqft;
  if (areaSqft > 50_000_000) return { ok: false, error: "That area is too large for this calculator." };
  const propertyType = input.propertyType as PropertyType;
  const areaType = (input.areaType || null) as AreaType | null;
  const step = tx === "rent" ? 500 : 10_000;
  const db = getDb();

  const result = (method: ValuationMethod, rates: number[], scope: string, basis: string, explanation: string): ValuationResult => {
    const sorted = [...rates].sort((a, b) => a - b);
    const r = { low: percentile(sorted, 0.25), mid: percentile(sorted, 0.5), high: percentile(sorted, 0.75) };
    return {
      ok: true,
      method,
      transactionType: tx,
      areaSqft,
      low: roundTo(r.low * areaSqft, step),
      mid: roundTo(r.mid * areaSqft, step),
      high: roundTo(r.high * areaSqft, step),
      rate: { low: Math.round(r.low), mid: Math.round(r.mid), high: Math.round(r.high) },
      sampleSize: rates.length,
      scope,
      basis,
      explanation,
    };
  };

  // 1. Verified comparable transactions (sale only), last 24 months.
  if (tx === "sale") {
    const since = new Date();
    since.setMonth(since.getMonth() - 24);
    const comps = await db
      .select({ locality: schema.marketComparables.locality, areaSqft: schema.marketComparables.areaSqft, price: schema.marketComparables.price, areaType: schema.marketComparables.areaType })
      .from(schema.marketComparables)
      .where(
        and(
          sql`lower(${schema.marketComparables.city}) = lower(${city})`,
          eq(schema.marketComparables.propertyType, propertyType),
          gte(schema.marketComparables.transactionDate, since.toISOString().slice(0, 10)),
        ),
      );
    const sameType = areaType ? comps.filter((c) => c.areaType === areaType) : comps;
    const pool = sameType.length >= MIN_SAMPLE ? sameType : comps;
    const local = locality ? pool.filter((c) => c.locality.toLowerCase() === locality.toLowerCase()) : [];
    const chosen = local.length >= MIN_SAMPLE ? local : pool;
    if (chosen.length >= MIN_SAMPLE) {
      const scope = local.length >= MIN_SAMPLE ? `${locality}, ${city}` : city;
      return result(
        "verified_comparables",
        chosen.map((c) => c.price / c.areaSqft),
        scope,
        `${chosen.length} verified sale transactions in ${scope} (last 24 months)`,
        "Range = 25th–75th percentile of price per sq ft from comparable sales recorded and verified by our team, multiplied by your area. This is an indicative estimate, not a formal valuation.",
      );
    }
  }

  // 2. Asking prices of real listings on this website (never demo listings).
  const rows = await db
    .select({ locality: schema.listings.locality, price: schema.listings.price, areaSqft: schema.listings.areaSqft, areaType: schema.listings.areaType })
    .from(schema.listings)
    .where(
      and(
        eq(schema.listings.isDemo, false),
        eq(schema.listings.transactionType, tx),
        eq(schema.listings.propertyType, propertyType),
        inArray(schema.listings.listingStatus, ["active", "under_offer", "sold", "rented"]),
        sql`lower(${schema.listings.city}) = lower(${city})`,
        isNotNull(schema.listings.price),
        sql`${schema.listings.areaSqft} > 0`,
      ),
    );
  const typed = areaType ? rows.filter((r) => r.areaType === areaType) : rows;
  const pool = typed.length >= MIN_SAMPLE ? typed : rows;
  const local = locality ? pool.filter((r) => r.locality.toLowerCase() === locality.toLowerCase()) : [];
  const chosen = local.length >= MIN_SAMPLE ? local : pool;
  if (chosen.length >= MIN_SAMPLE) {
    const scope = local.length >= MIN_SAMPLE ? `${locality}, ${city}` : city;
    return result(
      "listing_asking_prices",
      chosen.map((r) => (r.price as number) / (r.areaSqft as number)),
      scope,
      `asking ${tx === "rent" ? "rents" : "prices"} of ${chosen.length} listings on this website in ${scope}`,
      `Range = 25th–75th percentile of ${tx === "rent" ? "monthly rent" : "price"} per sq ft from listings advertised on this website, multiplied by your area. Asking prices are not achieved sale prices, so treat this as an illustrative estimate only.`,
    );
  }

  // 3. Illustrative calculation from the visitor's own reference rate.
  const userRate = input.userRatePerSqft ? Number(input.userRatePerSqft) : null;
  if (userRate && Number.isFinite(userRate) && userRate > 0 && userRate < 10_000_000) {
    const value = roundTo(userRate * areaSqft, step);
    return {
      ok: true,
      method: "user_rate",
      transactionType: tx,
      areaSqft,
      low: value,
      mid: value,
      high: value,
      rate: { low: userRate, mid: userRate, high: userRate },
      sampleSize: 0,
      scope: city,
      basis: "the reference rate you entered",
      explanation:
        "Illustrative calculation only: your area multiplied by the rate you entered. It does not use any market data and is not a valuation.",
    };
  }
  return {
    ok: true,
    method: "insufficient_data",
    transactionType: tx,
    areaSqft,
    low: null,
    mid: null,
    high: null,
    rate: null,
    sampleSize: chosen.length,
    scope: city,
    basis: "insufficient data",
    explanation: `We do not yet have at least ${MIN_SAMPLE} verified comparables or listings for this property type in ${city}. Enter a reference rate per sq ft (for example from a recent sale deed in your building) to see an illustrative calculation, or request a professional valuation.`,
  };
}
