/**
 * Column mapping: works out which spreadsheet column holds which listing field, so an
 * existing spreadsheet can be imported without renaming its columns.
 */
import { LISTING_FIELDS, type ListingFieldKey } from "@/lib/listings/fields";

export type ColumnMapping = Partial<Record<ListingFieldKey, number>>;

export function normaliseHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/₹/g, " inr ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const EXACT = new Map<string, ListingFieldKey>();
for (const f of LISTING_FIELDS) {
  for (const name of [f.key.replace(/_/g, " "), f.key, f.label, ...f.synonyms]) {
    const n = normaliseHeader(name);
    if (!EXACT.has(n)) EXACT.set(n, f.key);
  }
}

/** Keyword fallbacks for headers that are close but not exact ("Expected Price (Rs.)", "No. of BHK"). */
const FUZZY: [RegExp, ListingFieldKey][] = [
  [/\brera\b/, "rera_project_number"],
  [/\b(pin|zip|postal)\b/, "pincode"],
  [/\b(images?|photos?|pictures?|gallery)\b/, "image_urls"],
  [/\b(bhk|bed ?rooms?|beds)\b/, "bedrooms"],
  [/\b(bath ?rooms?|baths|toilets?|washrooms?)\b/, "bathrooms"],
  [/\bfurnish/, "furnishing_status"],
  [/\b(amenit|facilit|features)/, "amenities"],
  [/\bdescri/, "description"],
  [/\bdeposit\b/, "security_deposit"],
  [/\bmaintenance\b/, "maintenance_charges"],
  [/\bnegotiab/, "price_negotiable"],
  [/\bpossession\b/, "possession_status"],
  [/\bavailable (from|date|on)\b/, "available_from"],
  [/\b(updated|modified)\b/, "last_updated"],
  [/\b(sale|sell|buy)\b.*\b(rent|lease)\b|\b(rent|lease)\b.*\b(sale|sell|buy)\b/, "transaction_type"],
  [/\b(price|rent|amount|cost|rate)\b/, "price"],
  [/\b(locality|location|neighbou?rhood|sector|colony)\b/, "locality"],
  [/\bcity\b/, "city"],
  [/\bstate\b/, "state"],
  [/\bfeatured?\b/, "featured"],
  [/\bfacing\b/, "facing"],
  [/\bparking\b/, "parking"],
  [/\btotal floors?\b/, "total_floors"],
  [/\bfloor\b/, "floor"],
  [/\bstatus\b/, "listing_status"],
  [/\b(sale|rent|lease|transaction|deal)\b/, "transaction_type"],
  [/\b(property|unit) type\b/, "property_type"],
  [/\barea (type|basis)\b/, "area_type"],
  [/\b(unit|uom)\b/, "area_unit"],
  [/\b(area|size|sq ?ft|sqft|sq ?m|square)\b/, "area_value"],
  [/\b(id|ref|reference|code)\b/, "listing_id"],
  [/\b(title|heading|headline|name)\b/, "title"],
];

export function guessField(header: string): ListingFieldKey | null {
  const n = normaliseHeader(header);
  if (!n) return null;
  const exact = EXACT.get(n);
  if (exact) return exact;
  for (const [re, key] of FUZZY) if (re.test(n)) return key;
  return null;
}

/**
 * Finds the header row: the row (among the first 15) whose cells best match known field names.
 * Handles sheets that have a title or notes above the real header.
 */
export function detectHeaderRow(table: string[][]): number {
  let best = -1;
  let bestScore = 0;
  for (let i = 0; i < Math.min(table.length, 15); i++) {
    const row = table[i] ?? [];
    const nonEmpty = row.filter((c) => c.trim() !== "").length;
    if (nonEmpty < 2) continue;
    const exact = row.filter((c) => EXACT.has(normaliseHeader(c))).length;
    const fuzzy = row.filter((c) => guessField(c) !== null).length;
    const score = exact * 2 + fuzzy;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  if (best >= 0 && bestScore >= 3) return best;
  return Math.max(0, table.findIndex((r) => r.some((c) => c.trim() !== "")));
}

/** Automatic mapping. Exact header matches win over fuzzy ones; each field is used at most once. */
export function autoMap(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  headers.forEach((h, i) => {
    const key = EXACT.get(normaliseHeader(h));
    if (key && mapping[key] === undefined) {
      mapping[key] = i;
      used.add(i);
    }
  });
  headers.forEach((h, i) => {
    if (used.has(i)) return;
    const key = guessField(h);
    if (key && mapping[key] === undefined) {
      mapping[key] = i;
      used.add(i);
    }
  });
  return mapping;
}

export function headerSignature(headers: string[]): string {
  return headers
    .map(normaliseHeader)
    .filter(Boolean)
    .sort()
    .join("|");
}

/** Applies a saved profile (field → header text) to the current headers. */
export function mappingFromProfile(profile: Record<string, string>, headers: string[]): ColumnMapping {
  const norm = headers.map(normaliseHeader);
  const mapping: ColumnMapping = {};
  for (const [field, header] of Object.entries(profile)) {
    const idx = norm.indexOf(normaliseHeader(header));
    if (idx >= 0) mapping[field as ListingFieldKey] = idx;
  }
  return mapping;
}

export function profileFromMapping(mapping: ColumnMapping, headers: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, idx] of Object.entries(mapping)) if (idx !== undefined && headers[idx] !== undefined) out[field] = headers[idx];
  return out;
}

/** Validates a mapping submitted from the browser. */
export function sanitiseMapping(input: Record<string, unknown>, columnCount: number): ColumnMapping {
  const valid = new Set(LISTING_FIELDS.map((f) => f.key));
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  for (const [k, v] of Object.entries(input)) {
    if (!valid.has(k as ListingFieldKey)) continue;
    const idx = typeof v === "number" ? v : Number(v);
    if (!Number.isInteger(idx) || idx < 0 || idx >= columnCount || used.has(idx)) continue;
    mapping[k as ListingFieldKey] = idx;
    used.add(idx);
  }
  return mapping;
}

export function missingRequired(mapping: ColumnMapping): ListingFieldKey[] {
  return LISTING_FIELDS.filter((f) => f.required && mapping[f.key] === undefined).map((f) => f.key);
}
