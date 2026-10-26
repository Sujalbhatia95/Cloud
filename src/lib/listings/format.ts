import {
  AREA_TYPES,
  AREA_UNITS,
  FURNISHING,
  LISTING_STATUSES,
  POSSESSION,
  PROPERTY_TYPES,
  type AreaType,
  type AreaUnit,
} from "./constants";

const inrFull = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function trimDecimals(n: number, digits: number): string {
  return n.toFixed(digits).replace(/\.?0+$/, "");
}

/** ₹1.25 Cr · ₹45 L · ₹25,000 */
export function formatInrCompact(amount: number): string {
  if (amount >= 1e7) return `₹${trimDecimals(amount / 1e7, 2)} Cr`;
  if (amount >= 1e5) return `₹${trimDecimals(amount / 1e5, 2)} L`;
  return `₹${inrFull.format(amount)}`;
}

/** ₹1,25,00,000 */
export function formatInrFull(amount: number): string {
  return `₹${inrFull.format(amount)}`;
}

export function formatPrice(l: { price: number | null; transactionType: string }, opts: { compact?: boolean } = {}): string {
  if (l.price === null || l.price === undefined) return "Price on request";
  const base = opts.compact === false ? formatInrFull(l.price) : formatInrCompact(l.price);
  return l.transactionType === "rent" ? `${base}/month` : base;
}

export function formatArea(l: { areaValue: number | null; areaUnit: string | null }): string | null {
  if (l.areaValue === null || l.areaValue === undefined) return null;
  const unit = l.areaUnit && l.areaUnit in AREA_UNITS ? AREA_UNITS[l.areaUnit as AreaUnit].label : "sq ft";
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(l.areaValue)} ${unit}`;
}

export function areaTypeLabel(t: string | null): string {
  return t && t in AREA_TYPES ? AREA_TYPES[t as AreaType] : "Area";
}

export function propertyTypeLabel(t: string): string {
  return t in PROPERTY_TYPES ? PROPERTY_TYPES[t as keyof typeof PROPERTY_TYPES].label : t;
}

export function furnishingLabel(t: string | null): string | null {
  return t && t in FURNISHING ? FURNISHING[t as keyof typeof FURNISHING] : null;
}

export function possessionLabel(t: string | null): string | null {
  return t && t in POSSESSION ? POSSESSION[t as keyof typeof POSSESSION] : null;
}

export function statusLabel(t: string): string {
  return t in LISTING_STATUSES ? LISTING_STATUSES[t as keyof typeof LISTING_STATUSES] : t;
}

const istDate = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
const istDateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatDateIST(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T00:00:00+05:30` : d) : d;
  return istDate.format(date);
}

export function formatDateTimeIST(d: Date | string): string {
  return `${istDateTime.format(typeof d === "string" ? new Date(d) : d)} IST`;
}

export function listingSpecsLine(l: {
  bedrooms: number | null;
  bathrooms: number | null;
  areaValue: number | null;
  areaUnit: string | null;
}): string[] {
  const parts: string[] = [];
  if (l.bedrooms !== null && l.bedrooms !== undefined) parts.push(`${l.bedrooms} ${l.bedrooms === 1 ? "Bed" : "Beds"}`);
  if (l.bathrooms !== null && l.bathrooms !== undefined) parts.push(`${l.bathrooms} ${l.bathrooms === 1 ? "Bath" : "Baths"}`);
  const area = formatArea(l);
  if (area) parts.push(area);
  return parts;
}
