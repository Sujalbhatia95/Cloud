/**
 * Forgiving parsers that turn human-entered spreadsheet / form values into canonical values.
 * Every parser returns either a value or an error message suitable for an import error report.
 * Pure functions — safe to use on the server, in scripts and in unit tests.
 */
import {
  AREA_TYPES,
  AREA_UNITS,
  FURNISHING,
  INDIAN_STATES_AND_UTS,
  LISTING_STATUSES,
  POSSESSION,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
  type AreaType,
  type AreaUnit,
  type Furnishing,
  type ListingStatus,
  type Possession,
  type PropertyType,
  type TransactionType,
} from "./constants";

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const fail = <T = never>(error: string): Parsed<T> => ({ ok: false, error });

/** Trim, collapse internal whitespace, strip zero-width characters; empty → null. */
export function cleanText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v)
    .replace(/[​-‍﻿]/g, "")
    .replace(/ /g, " ")
    .trim();
  return s === "" ? null : s;
}

export function cleanSingleLine(v: unknown): string | null {
  const s = cleanText(v);
  return s === null ? null : s.replace(/\s+/g, " ");
}

/** "Semi-Furnished " → "semi_furnished" */
export function toKey(v: string): string {
  return v
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function lookup<T extends string>(
  raw: unknown,
  canonical: Record<string, unknown>,
  synonyms: Record<string, T>,
  what: string,
): Parsed<T> {
  const s = cleanSingleLine(raw);
  if (s === null) return fail(`${what} is required`);
  const key = toKey(s);
  if (key in canonical) return ok(key as T);
  if (key in synonyms) return ok(synonyms[key]);
  const allowed = Object.keys(canonical).join(", ");
  return fail(`${what} "${s}" is not recognised (use one of: ${allowed})`);
}

/* ------------------------------ Enumerations ------------------------------ */

const TRANSACTION_SYNONYMS: Record<string, TransactionType> = {
  sell: "sale", buy: "sale", resale: "sale", purchase: "sale", for_sale: "sale", sales: "sale",
  outright: "sale", outright_sale: "sale", new_booking: "sale", booking: "sale",
  rental: "rent", lease: "rent", leasing: "rent", for_rent: "rent", to_let: "rent", let: "rent",
  rent_out: "rent", for_lease: "rent", pg: "rent",
};
export const parseTransactionType = (v: unknown) =>
  lookup<TransactionType>(v, TRANSACTION_TYPES, TRANSACTION_SYNONYMS, "transaction_type");

const STATUS_SYNONYMS: Record<string, ListingStatus> = {
  available: "active", live: "active", published: "active", open: "active", yes: "active", new: "active",
  for_sale: "active", for_rent: "active", listed: "active", publish: "active",
  underoffer: "under_offer", reserved: "under_offer", on_hold: "under_offer", hold: "under_offer",
  booked: "under_offer", token_received: "under_offer", negotiation: "under_offer", under_negotiation: "under_offer",
  closed: "sold", sold_out: "sold",
  let_out: "rented", leased: "rented", leased_out: "rented", occupied: "rented",
  inactive: "archived", withdrawn: "archived", expired: "archived", off_market: "archived",
  delisted: "archived", hidden: "archived", removed: "archived", unavailable: "archived", no: "archived",
  pending: "draft", coming_soon: "draft", unpublished: "draft",
};
export const parseListingStatus = (v: unknown) =>
  lookup<ListingStatus>(v, LISTING_STATUSES, STATUS_SYNONYMS, "listing_status");

const PROPERTY_SYNONYMS: Record<string, PropertyType> = {
  flat: "apartment", apartments: "apartment", apt: "apartment", residential_apartment: "apartment",
  flat_apartment: "apartment", apartment_flat: "apartment", condo: "apartment", multistorey_apartment: "apartment",
  house: "independent_house", independent_villa: "villa", bungalow: "independent_house", kothi: "independent_house",
  independent_house_villa: "independent_house", duplex: "independent_house", individual_house: "independent_house",
  floor: "builder_floor", independent_floor: "builder_floor", builder_floor_apartment: "builder_floor",
  studio_apartment: "studio", "1rk": "studio", "1_rk": "studio", rk: "studio",
  rowhouse: "row_house", townhouse: "row_house", town_house: "row_house",
  farmhouse: "farm_house",
  plot: "residential_plot", land: "residential_plot", residential_land: "residential_plot", na_plot: "residential_plot",
  commercial_land: "commercial_plot",
  agriculture_land: "agricultural_land", agricultural: "agricultural_land", farm_land: "agricultural_land",
  farmland: "agricultural_land", agri_land: "agricultural_land",
  industrial_plot: "industrial_land",
  office_space: "office", commercial_office: "office", offices: "office", it_office: "office",
  retail: "shop", retail_shop: "shop", commercial_shop: "shop", shops: "shop", retail_space: "shop",
  show_room: "showroom",
  godown: "warehouse", warehouse_godown: "warehouse", storage: "warehouse",
  shed: "industrial_shed", factory: "industrial_shed", industrial_building: "industrial_shed",
  co_working: "coworking", co_working_space: "coworking", coworking_space: "coworking",
  guest_house: "hotel", hotel_guest_house: "hotel", resort: "hotel",
};
export const parsePropertyType = (v: unknown) =>
  lookup<PropertyType>(v, PROPERTY_TYPES, PROPERTY_SYNONYMS, "property_type");

const FURNISHING_SYNONYMS: Record<string, Furnishing> = {
  bare: "unfurnished", bare_shell: "unfurnished", none: "unfurnished", not_furnished: "unfurnished", no: "unfurnished",
  semi: "semi_furnished", semifurnished: "semi_furnished", partly_furnished: "semi_furnished",
  furnished: "fully_furnished", full: "fully_furnished", fullyfurnished: "fully_furnished", full_furnished: "fully_furnished",
};
export const parseFurnishing = (v: unknown) =>
  lookup<Furnishing>(v, FURNISHING, FURNISHING_SYNONYMS, "furnishing_status");

const POSSESSION_SYNONYMS: Record<string, Possession> = {
  ready: "ready_to_move", rtm: "ready_to_move", ready_to_move_in: "ready_to_move", completed: "ready_to_move",
  ready_possession: "ready_to_move", immediate: "ready_to_move",
  uc: "under_construction", new_launch: "under_construction", upcoming: "under_construction",
  underconstruction: "under_construction", ongoing: "under_construction",
};
export const parsePossession = (v: unknown) =>
  lookup<Possession>(v, POSSESSION, POSSESSION_SYNONYMS, "possession_status");

const AREA_TYPE_SYNONYMS: Record<string, AreaType> = {
  carpet_area: "carpet", rera_carpet: "carpet", rera_carpet_area: "carpet",
  builtup: "built_up", built_up_area: "built_up", bua: "built_up", builtup_area: "built_up",
  super_builtup: "super_built_up", super_area: "super_built_up", super_built_up_area: "super_built_up",
  sba: "super_built_up", saleable: "super_built_up", saleable_area: "super_built_up", super: "super_built_up",
  plot_area: "plot", land_area: "plot", land: "plot",
};
export const parseAreaType = (v: unknown) =>
  lookup<AreaType>(v, AREA_TYPES, AREA_TYPE_SYNONYMS, "area_type");

const AREA_UNIT_SYNONYMS: Record<string, AreaUnit> = {
  sq_ft: "sqft", sq_feet: "sqft", square_feet: "sqft", square_foot: "sqft", sft: "sqft", ft2: "sqft",
  sq_ft_: "sqft", sqfeet: "sqft", feet: "sqft", ft: "sqft", sf: "sqft",
  sq_m: "sqm", sq_mt: "sqm", sq_mtr: "sqm", square_meter: "sqm", square_metre: "sqm", square_meters: "sqm",
  square_metres: "sqm", m2: "sqm", sqmt: "sqm", sqmtr: "sqm",
  sq_yd: "sqyd", sq_yard: "sqyd", sq_yards: "sqyd", square_yard: "sqyd", square_yards: "sqyd", gaj: "sqyd",
  gaz: "sqyd", yd2: "sqyd", sqyard: "sqyd",
  acres: "acre", ac: "acre",
  hectares: "hectare", ha: "hectare",
};
const VARIABLE_UNITS = new Set(["bigha", "biswa", "guntha", "gunta", "kanal", "marla", "cent", "cents", "ground", "katha", "kattha", "dhur", "ankanam"]);

export function parseAreaUnit(v: unknown): Parsed<AreaUnit> {
  const s = cleanSingleLine(v);
  if (s === null) return fail("area_unit is required when area_value is given");
  const key = toKey(s.replace(/²/g, "2"));
  if (key in AREA_UNITS) return ok(key as AreaUnit);
  if (key in AREA_UNIT_SYNONYMS) return ok(AREA_UNIT_SYNONYMS[key]);
  if (VARIABLE_UNITS.has(key) || VARIABLE_UNITS.has(key.replace(/s$/, "")))
    return fail(`area_unit "${s}" varies between states — please convert to sq ft, sq m or sq yd`);
  return fail(`area_unit "${s}" is not recognised (use sqft, sqm, sqyd, acre or hectare)`);
}

export function parseState(v: unknown): Parsed<{ value: string; recognised: boolean }> {
  const s = cleanSingleLine(v);
  if (s === null) return fail("state is required");
  const key = toKey(s);
  for (const st of INDIAN_STATES_AND_UTS) if (toKey(st) === key) return ok({ value: st, recognised: true });
  const aliases: Record<string, string> = {
    mh: "Maharashtra", up: "Uttar Pradesh", dl: "Delhi", nct: "Delhi", nct_of_delhi: "Delhi", new_delhi: "Delhi",
    delhi_ncr: "Delhi", ka: "Karnataka", tn: "Tamil Nadu", gj: "Gujarat", rj: "Rajasthan", mp: "Madhya Pradesh",
    wb: "West Bengal", hr: "Haryana", pb: "Punjab", ts: "Telangana", tg: "Telangana", ap: "Andhra Pradesh",
    kl: "Kerala", od: "Odisha", or: "Odisha", orissa: "Odisha", uk: "Uttarakhand", ua: "Uttarakhand",
    uttaranchal: "Uttarakhand", hp: "Himachal Pradesh", jk: "Jammu and Kashmir", j_and_k: "Jammu and Kashmir",
    ga: "Goa", cg: "Chhattisgarh", ct: "Chhattisgarh", jh: "Jharkhand", br: "Bihar", as: "Assam",
    pondicherry: "Puducherry", py: "Puducherry", ch: "Chandigarh", tamilnadu: "Tamil Nadu",
  };
  if (key in aliases) return ok({ value: aliases[key], recognised: true });
  return ok({ value: smartTitleCase(s), recognised: false });
}

/* ------------------------------ Scalars ------------------------------ */

/** Title-cases text that was typed in all-lower or ALL-UPPER case; leaves mixed case untouched. */
export function smartTitleCase(s: string): string {
  if (s !== s.toLowerCase() && s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s\-/(])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());
}

const PRICE_ON_REQUEST = new Set(["price_on_request", "por", "on_request", "call_for_price", "ask", "negotiable_on_request", "contact_for_price"]);

/**
 * Parses Indian price notations into whole rupees.
 *  "₹ 1.25 Cr" → 12500000 · "45 Lakh" → 4500000 · "1,25,00,000" → 12500000 · "25k" → 25000
 * Returns null for explicit "Price on request".
 */
export function parseInr(v: unknown, field = "price"): Parsed<number | null> {
  const raw = cleanSingleLine(v);
  if (raw === null) return fail(`${field} is required (write "Price on request" if it is not disclosed)`);
  if (PRICE_ON_REQUEST.has(toKey(raw))) return ok(null);
  const s = raw
    .toLowerCase()
    .replace(/₹|\binr\b|\brs\.?|\brupees?\b/g, "")
    .replace(/\/-|\bonly\b/g, "")
    .replace(/(\/|\bper\b)\s*(month|mon|mo|pm|m)\b|\bp\.?m\.?$|\bmonthly\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const m = s.match(/^(\d[\d,]*(?:\.\d+)?|\.\d+)\s*(crores?|cr|lakhs?|lacs?|lac|l|k|thousand)?$/);
  if (!m) return fail(`${field} "${raw}" is not a valid amount (examples: 4500000, 45 Lakh, 1.25 Cr, 25000)`);
  const num = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(num)) return fail(`${field} "${raw}" is not a valid amount`);
  const unit = m[2] ?? "";
  const mult = /^cr/.test(unit) ? 1e7 : /^(lakh|lac|l$)/.test(unit) ? 1e5 : /^(k|thousand)/.test(unit) ? 1e3 : 1;
  const rupees = Math.round(num * mult);
  if (rupees <= 0) return fail(`${field} must be greater than zero`);
  if (rupees > 1e12) return fail(`${field} "${raw}" is unrealistically large`);
  return ok(rupees);
}

export function parseOptionalInr(v: unknown, field: string): Parsed<number | null> {
  if (cleanText(v) === null) return ok(null);
  const r = parseInr(v, field);
  return r;
}

/** Parses a plain number ("1,250", "1250.5", "1250 sq ft"); returns the trailing unit text if any. */
export function parseNumberWithUnit(v: unknown, field: string): Parsed<{ value: number; unit: string | null } | null> {
  const s = cleanSingleLine(v);
  if (s === null) return ok(null);
  const m = s.match(/^(\d[\d,]*(?:\.\d+)?|\.\d+)\s*([a-zA-Z.\s²]*)$/);
  if (!m) return fail(`${field} "${s}" is not a number`);
  const value = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(value)) return fail(`${field} "${s}" is not a number`);
  return ok({ value, unit: m[2]?.trim() ? m[2].trim() : null });
}

export function parseOptionalInt(v: unknown, field: string, min: number, max: number): Parsed<number | null> {
  const s = cleanSingleLine(v);
  if (s === null) return ok(null);
  const m = s.match(/^(\d+)(?:\.0+)?\s*(?:bhk|rk|bed(?:room)?s?|bath(?:room)?s?|floors?|years?|yrs?)?\+?$/i);
  if (!m) return fail(`${field} "${s}" must be a whole number`);
  const n = Number(m[1]);
  if (n < min || n > max) return fail(`${field} must be between ${min} and ${max}`);
  return ok(n);
}

const TRUE_WORDS = new Set(["yes", "y", "true", "1", "featured", "x", "✓", "✔", "on", "t"]);
const FALSE_WORDS = new Set(["no", "n", "false", "0", "off", "f", "-"]);
export function parseBoolean(v: unknown, field: string): Parsed<boolean> {
  const s = cleanSingleLine(v);
  if (s === null) return ok(false);
  const k = s.toLowerCase();
  if (TRUE_WORDS.has(k)) return ok(true);
  if (FALSE_WORDS.has(k)) return ok(false);
  return fail(`${field} "${s}" must be Yes or No`);
}

export function parsePincode(v: unknown): Parsed<string | null> {
  const s = cleanSingleLine(v);
  if (s === null) return ok(null);
  const digits = s.replace(/[\s-]/g, "").replace(/\.0+$/, "");
  if (!/^[1-9]\d{5}$/.test(digits)) return fail(`pincode "${s}" must be a 6-digit Indian PIN code`);
  return ok(digits);
}

export const LISTING_ID_PATTERN = /^[A-Z0-9][A-Z0-9_.-]{0,63}$/;
export function parseListingId(v: unknown): Parsed<string> {
  const s = cleanSingleLine(v);
  if (s === null) return fail("listing_id is required");
  const id = s.replace(/\.0+$/, "").replace(/\s+/g, "-").toUpperCase();
  if (!LISTING_ID_PATTERN.test(id))
    return fail(`listing_id "${s}" may only contain letters, numbers, "-", "_" and "." (max 64 characters)`);
  return ok(id);
}

/** Splits amenity lists written as "Lift; Parking | Gym, Pool" or one per line. */
export function parseList(v: unknown, maxItems: number, maxLen: number): string[] {
  const s = cleanText(v);
  if (s === null) return [];
  const items = s
    .split(/\s*(?:[\n\r|;,•]+)\s*/)
    .map((x) => x.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((x) => x.slice(0, maxLen));
  return Array.from(new Set(items)).slice(0, maxItems);
}

/**
 * Splits and validates image URLs. Accepts https URLs and site-relative paths ("/demo/x.jpg").
 * Google Drive and Dropbox share links are converted to direct image links.
 */
export function parseImageUrls(v: unknown): { urls: string[]; errors: string[] } {
  const s = cleanText(v);
  if (s === null) return { urls: [], errors: [] };
  const parts = s.split(/\s*(?:[|;\n\r]+|,(?=\s*(?:https?:\/\/|\/))|\s+(?=https?:\/\/))\s*/).filter(Boolean);
  const urls: string[] = [];
  const errors: string[] = [];
  for (const part of parts) {
    const r = normaliseImageUrl(part);
    if (r.ok) {
      if (!urls.includes(r.value)) urls.push(r.value);
    } else errors.push(r.error);
  }
  if (urls.length > 30) errors.push(`image_urls has ${urls.length} images; the maximum is 30`);
  return { urls: urls.slice(0, 30), errors };
}

export function normaliseImageUrl(input: string): Parsed<string> {
  const s = input.trim();
  if (/^\/(?!\/)[\w\-./%]+\.(?:jpe?g|png|webp|avif|gif)$/i.test(s) && !s.includes("..")) return ok(s);
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return fail(`image URL "${s.slice(0, 80)}" is not a valid web address`);
  }
  if (url.protocol !== "https:") return fail(`image URL "${s.slice(0, 80)}" must start with https://`);
  if (url.username || url.password) return fail(`image URL "${s.slice(0, 80)}" must not contain credentials`);
  // Google Drive: /file/d/<id>/view or open?id=<id> → direct image host (file must be shared "Anyone with the link")
  if (url.hostname === "drive.google.com") {
    const id = url.pathname.match(/\/file\/d\/([\w-]{10,})/)?.[1] ?? url.searchParams.get("id");
    if (id && /^[\w-]{10,}$/.test(id)) return ok(`https://lh3.googleusercontent.com/d/${id}`);
    return fail(`Google Drive link "${s.slice(0, 80)}" is not a file share link`);
  }
  if (url.hostname === "www.dropbox.com" || url.hostname === "dropbox.com") {
    url.searchParams.delete("dl");
    url.searchParams.set("raw", "1");
    return ok(url.toString());
  }
  if (s.length > 2000) return fail("image URL is too long");
  return ok(url.toString());
}

/**
 * Parses dates written the Indian way (day first): 25-10-2026, 25/10/2026, 25.10.2026,
 * ISO 2026-10-25, "25 Oct 2026", Excel serial numbers, and ISO date-times.
 */
export function parseDate(v: unknown, field: string): Parsed<Date | null> {
  const s = cleanSingleLine(v);
  if (s === null) return ok(null);
  let m: RegExpMatchArray | null;
  const mk = (y: number, mo: number, d: number, h = 0, mi = 0, se = 0) => {
    // Interpret wall-clock times in India Standard Time (UTC+05:30)
    const dt = new Date(Date.UTC(y, mo - 1, d, h, mi, se) - 330 * 60 * 1000);
    const check = new Date(dt.getTime() + 330 * 60 * 1000);
    if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
    return dt;
  };
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/))) {
    if (m[7]) {
      const d = new Date(s.replace(" ", "T"));
      return Number.isNaN(d.getTime()) ? fail(`${field} "${s}" is not a valid date`) : ok(d);
    }
    const d = mk(+m[1], +m[2], +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
    return d ? ok(d) : fail(`${field} "${s}" is not a valid date`);
  }
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i))) {
    let y = +m[3];
    if (y < 100) y += 2000;
    let h = +(m[4] ?? 0);
    if (m[7]) h = (h % 12) + (m[7].toLowerCase() === "pm" ? 12 : 0);
    const d = mk(y, +m[2], +m[1], h, +(m[5] ?? 0), +(m[6] ?? 0));
    return d ? ok(d) : fail(`${field} "${s}" is not a valid date (use DD-MM-YYYY or YYYY-MM-DD)`);
  }
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]{3,9})[\s,-]+(\d{4})$/i))) {
    const mo = months.indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
    const d = mo ? mk(+m[3], mo, +m[1]) : null;
    return d ? ok(d) : fail(`${field} "${s}" is not a valid date`);
  }
  if ((m = s.match(/^([a-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/i))) {
    const mo = months.indexOf(m[1].slice(0, 3).toLowerCase()) + 1;
    const d = mo ? mk(+m[3], mo, +m[2]) : null;
    return d ? ok(d) : fail(`${field} "${s}" is not a valid date`);
  }
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    // Excel serial date (days since 1899-12-30)
    const serial = Number(s);
    if (serial > 20000 && serial < 80000) {
      const base = Date.UTC(1899, 11, 30);
      const ms = base + Math.round(serial * 86400000);
      const utc = new Date(ms);
      const d = mk(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate(), utc.getUTCHours(), utc.getUTCMinutes());
      return d ? ok(d) : fail(`${field} "${s}" is not a valid date`);
    }
  }
  return fail(`${field} "${s}" is not a valid date (use DD-MM-YYYY or YYYY-MM-DD)`);
}

/** YYYY-MM-DD in India Standard Time. */
export function toIstDateString(d: Date): string {
  const ist = new Date(d.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}
