/**
 * URL <-> filter conversion for the Buy / Rent / Commercial search pages.
 * Pure (no DB) so it can be unit-tested and reused by client components.
 */
import {
  CATEGORIES,
  FURNISHING,
  PROPERTY_TYPES,
  SORT_OPTIONS,
  type Category,
  type Furnishing,
  type PropertyType,
  type SortOption,
  type TransactionType,
} from "./constants";

export const AVAILABILITY_OPTIONS = {
  "": "All available listings",
  now: "Available now / ready to move",
  under_construction: "Under construction",
  include_under_offer: "Include properties under offer",
} as const;
export type Availability = keyof typeof AVAILABILITY_OPTIONS;

export type SearchFilters = {
  q: string;
  city: string;
  locality: string;
  state: string;
  pincode: string;
  deal: TransactionType | null;
  category: Category | null;
  type: PropertyType | null;
  minPrice: number | null;
  maxPrice: number | null;
  beds: number | null;
  baths: number | null;
  minArea: number | null;
  maxArea: number | null;
  furnishing: Furnishing | null;
  availability: Availability;
  sort: SortOption;
  page: number;
};

export type SearchPreset = { deal?: TransactionType; category?: Category };

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const text = (v: string | string[] | undefined, max = 80) =>
  first(v).replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);
const positiveInt = (v: string | string[] | undefined, max = Number.MAX_SAFE_INTEGER): number | null => {
  const s = first(v).replace(/[,\s₹]/g, "");
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n > 0 && n <= max ? n : null;
};
const oneOf = <T extends string>(v: string | string[] | undefined, allowed: Record<string, unknown>): T | null => {
  const s = first(v);
  return s && Object.prototype.hasOwnProperty.call(allowed, s) ? (s as T) : null;
};

export function parseSearchParams(raw: RawParams, preset: SearchPreset = {}): SearchFilters {
  let minPrice = positiveInt(raw.minPrice, 1e12);
  let maxPrice = positiveInt(raw.maxPrice, 1e12);
  if (minPrice && maxPrice && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
  let minArea = positiveInt(raw.minArea, 1e9);
  let maxArea = positiveInt(raw.maxArea, 1e9);
  if (minArea && maxArea && minArea > maxArea) [minArea, maxArea] = [maxArea, minArea];
  const pin = first(raw.pincode).replace(/\D/g, "").slice(0, 6);
  const dealParam = oneOf<TransactionType>(raw.deal, { sale: 1, rent: 1 });
  return {
    q: text(raw.q, 100),
    city: text(raw.city),
    locality: text(raw.locality),
    state: text(raw.state),
    pincode: pin,
    deal: preset.deal ?? dealParam,
    category: preset.category ?? oneOf<Category>(raw.category, CATEGORIES),
    type: oneOf<PropertyType>(raw.type, PROPERTY_TYPES),
    minPrice,
    maxPrice,
    beds: positiveInt(raw.beds, 10),
    baths: positiveInt(raw.baths, 10),
    minArea,
    maxArea,
    furnishing: oneOf<Furnishing>(raw.furnishing, FURNISHING),
    availability: (oneOf<Availability>(raw.availability, AVAILABILITY_OPTIONS) ?? "") as Availability,
    sort: oneOf<SortOption>(raw.sort, SORT_OPTIONS) ?? "newest",
    page: positiveInt(raw.page, 10_000) ?? 1,
  };
}

/** Serialises filters back to a query string, omitting defaults and preset-controlled keys. */
export function toQueryString(f: Partial<SearchFilters>, preset: SearchPreset = {}, overrides: Partial<Record<keyof SearchFilters, unknown>> = {}): string {
  const merged = { ...f, ...overrides } as Record<string, unknown>;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === null || v === undefined || v === "") continue;
    if (k === "deal" && preset.deal) continue;
    if (k === "category" && preset.category) continue;
    if (k === "sort" && v === "newest") continue;
    if (k === "page" && Number(v) <= 1) continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const BUY_PRICE_STEPS = [
  1_000_000, 2_500_000, 5_000_000, 7_500_000, 10_000_000, 15_000_000, 20_000_000, 30_000_000, 50_000_000, 100_000_000,
];
export const RENT_PRICE_STEPS = [5_000, 10_000, 15_000, 25_000, 40_000, 60_000, 100_000, 200_000, 500_000];
