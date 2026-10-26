/**
 * Turns one row of raw (string) values into a validated, normalised listing.
 * Shared by the spreadsheet import, the admin listing editor and the seed script,
 * so every path into the database applies identical rules.
 */
import { createHash } from "node:crypto";
import {
  AREA_UNITS,
  PROPERTY_TYPES,
  type AreaType,
  type AreaUnit,
  type Category,
  type Furnishing,
  type ListingStatus,
  type Possession,
  type PropertyType,
  type TransactionType,
} from "./constants";
import type { ListingFieldKey } from "./fields";
import {
  cleanSingleLine,
  cleanText,
  parseAreaType,
  parseAreaUnit,
  parseBoolean,
  parseDate,
  parseFurnishing,
  parseImageUrls,
  parseInr,
  parseList,
  parseListingId,
  parseListingStatus,
  parseNumberWithUnit,
  parseOptionalInr,
  parseOptionalInt,
  parsePincode,
  parsePossession,
  parsePropertyType,
  parseState,
  parseTransactionType,
  smartTitleCase,
  toIstDateString,
  type Parsed,
} from "./normalize";
import { slugify } from "./slug";

export type NormalisedListing = {
  listingId: string;
  slug: string;
  title: string;
  transactionType: TransactionType;
  propertyType: PropertyType;
  category: Category;
  listingStatus: ListingStatus;
  price: number | null;
  priceNegotiable: boolean;
  locality: string;
  city: string;
  state: string;
  pincode: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaValue: number | null;
  areaUnit: AreaUnit | null;
  areaType: AreaType | null;
  areaSqft: number | null;
  furnishingStatus: Furnishing | null;
  possessionStatus: Possession | null;
  availableFrom: string | null;
  floor: string | null;
  totalFloors: number | null;
  parking: string | null;
  facing: string | null;
  ageYears: number | null;
  maintenanceCharges: number | null;
  securityDeposit: number | null;
  description: string | null;
  amenities: string[];
  imageUrls: string[];
  featured: boolean;
  reraProjectNumber: string | null;
};

/** Fields compared to decide whether a re-imported row changed anything. */
export const CONTENT_FIELDS = [
  "title", "transactionType", "propertyType", "category", "listingStatus", "price", "priceNegotiable",
  "locality", "city", "state", "pincode", "bedrooms", "bathrooms", "areaValue", "areaUnit", "areaType",
  "areaSqft", "furnishingStatus", "possessionStatus", "availableFrom", "floor", "totalFloors", "parking",
  "facing", "ageYears", "maintenanceCharges", "securityDeposit", "description", "amenities", "imageUrls",
  "featured", "reraProjectNumber",
] as const satisfies readonly (keyof NormalisedListing)[];
export type ContentField = (typeof CONTENT_FIELDS)[number];

export type RowValidation = {
  listing: NormalisedListing | null;
  sourceUpdatedAt: Date | null;
  errors: string[];
  warnings: string[];
};

const NOT_APPLICABLE = /^(n\/?a|na|nil|none|not applicable|-+|—|not available)$/i;
const RESIDENTIAL_WITH_ROOMS: PropertyType[] = [
  "apartment", "independent_house", "villa", "builder_floor", "penthouse", "row_house", "farm_house",
];

export function validateListingRow(
  raw: Partial<Record<ListingFieldKey, unknown>>,
  now = new Date(),
  opts: { allowDemoIds?: boolean } = {},
): RowValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const take = <T>(r: Parsed<T>, fallback: T): T => {
    if (r.ok) return r.value;
    errors.push(r.error);
    return fallback;
  };

  const listingId = take(parseListingId(raw.listing_id), "");
  const titleRaw = cleanSingleLine(raw.title);
  let title = "";
  if (!titleRaw) errors.push("title is required");
  else if (titleRaw.length < 5) errors.push("title must be at least 5 characters");
  else if (titleRaw.length > 150) errors.push(`title is ${titleRaw.length} characters; the maximum is 150`);
  else title = titleRaw;

  const transactionType = take(parseTransactionType(raw.transaction_type), "sale" as TransactionType);
  const propertyType = take(parsePropertyType(raw.property_type), "apartment" as PropertyType);
  const category = PROPERTY_TYPES[propertyType].category as Category;
  const listingStatus = take(parseListingStatus(raw.listing_status), "draft" as ListingStatus);
  const price = take(parseInr(raw.price, "price"), null);
  const priceNegotiable = take(parseBoolean(raw.price_negotiable, "price_negotiable"), false);

  const requiredText = (key: ListingFieldKey, max: number) => {
    const s = cleanSingleLine(raw[key]);
    if (!s) {
      errors.push(`${key} is required`);
      return "";
    }
    if (s.length > max) {
      errors.push(`${key} is longer than ${max} characters`);
      return "";
    }
    return smartTitleCase(s);
  };
  const locality = requiredText("locality", 100);
  const city = requiredText("city", 80);
  const stateParsed = take(parseState(raw.state), { value: "", recognised: true });
  if (stateParsed.value && !stateParsed.recognised)
    warnings.push(`state "${stateParsed.value}" is not a recognised Indian state/UT name — check spelling`);
  const pincode = take(parsePincode(raw.pincode), null);

  const bedrooms = take(parseOptionalInt(raw.bedrooms, "bedrooms", 0, 30), null);
  const bathrooms = take(parseOptionalInt(raw.bathrooms, "bathrooms", 0, 30), null);

  // Area: value may carry its own unit ("1250 sq ft") if no unit column is mapped.
  let areaValue: number | null = null;
  let areaUnit: AreaUnit | null = null;
  let areaType: AreaType | null = null;
  const areaParsed = take(parseNumberWithUnit(raw.area_value, "area_value"), null);
  if (areaParsed) {
    if (areaParsed.value <= 0) errors.push("area_value must be greater than zero");
    else areaValue = areaParsed.value;
    const unitSource = cleanText(raw.area_unit) ?? areaParsed.unit;
    if (unitSource) areaUnit = take(parseAreaUnit(unitSource), null);
    else {
      areaUnit = "sqft";
      warnings.push("area_unit missing — assumed sq ft");
    }
  } else if (cleanText(raw.area_unit)) {
    take(parseAreaUnit(raw.area_unit), null);
  }
  if (cleanText(raw.area_type)) areaType = take(parseAreaType(raw.area_type), null);
  else if (areaValue !== null) warnings.push("area_type missing — say whether the area is Carpet, Built-up, Super built-up or Plot");
  const areaSqft = areaValue !== null && areaUnit ? Math.round(areaValue * AREA_UNITS[areaUnit].toSqft * 100) / 100 : null;
  if (areaSqft !== null && areaSqft > 1e9) errors.push("area is unrealistically large");

  const furnishingStatus = cleanText(raw.furnishing_status) ? take(parseFurnishing(raw.furnishing_status), null) : null;
  const possessionStatus = cleanText(raw.possession_status) ? take(parsePossession(raw.possession_status), null) : null;
  const availableFromDate = take(parseDate(raw.available_from, "available_from"), null);
  const availableFrom = availableFromDate ? toIstDateString(availableFromDate) : null;

  const shortText = (key: ListingFieldKey, max: number) => {
    const s = cleanSingleLine(raw[key]);
    if (!s) return null;
    if (s.length > max) {
      errors.push(`${key} is longer than ${max} characters`);
      return null;
    }
    return s;
  };
  const floor = shortText("floor", 30);
  const totalFloors = take(parseOptionalInt(raw.total_floors, "total_floors", 0, 250), null);
  const parking = shortText("parking", 80);
  const facing = shortText("facing", 40);
  const ageYears = take(parseOptionalInt(raw.age_years, "age_years", 0, 300), null);
  const maintenanceCharges = take(parseOptionalInr(raw.maintenance_charges, "maintenance_charges"), null);
  const securityDeposit = take(parseOptionalInr(raw.security_deposit, "security_deposit"), null);

  let description = cleanText(raw.description);
  if (description && description.length > 5000) {
    errors.push(`description is ${description.length} characters; the maximum is 5,000`);
    description = null;
  }
  const amenities = parseList(raw.amenities, 40, 60);
  const images = parseImageUrls(raw.image_urls);
  errors.push(...images.errors);
  const featured = take(parseBoolean(raw.featured, "featured"), false);

  let reraProjectNumber = cleanSingleLine(raw.rera_project_number);
  if (reraProjectNumber && NOT_APPLICABLE.test(reraProjectNumber)) reraProjectNumber = null;
  if (reraProjectNumber && reraProjectNumber.length > 80) {
    errors.push("rera_project_number is longer than 80 characters");
    reraProjectNumber = null;
  }

  let sourceUpdatedAt = take(parseDate(raw.last_updated, "last_updated"), null);
  if (sourceUpdatedAt && sourceUpdatedAt.getTime() > now.getTime() + 36 * 3600 * 1000) {
    warnings.push("last_updated is in the future — ignored");
    sourceUpdatedAt = null;
  }

  // Sanity / compliance warnings (do not block the import)
  if (price !== null && transactionType === "rent" && price > 2_000_000)
    warnings.push("monthly rent is above ₹20 lakh — check this is not a sale price");
  if (price !== null && transactionType === "sale" && price < 100_000)
    warnings.push("sale price is below ₹1 lakh — check the amount (e.g. write \"45 Lakh\")");
  if (RESIDENTIAL_WITH_ROOMS.includes(propertyType) && bedrooms === null) warnings.push("bedrooms not provided");
  if (areaValue === null) warnings.push("area not provided");
  if (!description) warnings.push("description not provided");
  if (images.urls.length === 0) warnings.push("no images — a placeholder will be shown");
  if (transactionType === "sale" && possessionStatus === "under_construction" && !reraProjectNumber)
    warnings.push(
      "under-construction property for sale has no RERA project number — projects that require registration cannot be advertised without it; confirm with your legal adviser",
    );
  if (reraProjectNumber && areaType && areaType !== "carpet")
    warnings.push("RERA-registered projects should state the carpet area");

  if (listingId.startsWith("DEMO-") && !opts.allowDemoIds) errors.push('listing IDs starting with "DEMO-" are reserved for demo listings');

  if (errors.length > 0) return { listing: null, sourceUpdatedAt, errors, warnings };

  const listing: NormalisedListing = {
    listingId,
    slug: slugify(`${title} ${locality} ${city}`),
    title,
    transactionType,
    propertyType,
    category,
    listingStatus,
    price,
    priceNegotiable,
    locality,
    city,
    state: stateParsed.value,
    pincode,
    bedrooms,
    bathrooms,
    areaValue,
    areaUnit,
    areaType,
    areaSqft,
    furnishingStatus,
    possessionStatus,
    availableFrom,
    floor,
    totalFloors,
    parking,
    facing,
    ageYears,
    maintenanceCharges,
    securityDeposit,
    description,
    amenities,
    imageUrls: images.urls,
    featured,
    reraProjectNumber,
  };
  return { listing, sourceUpdatedAt, errors, warnings };
}

function canonicalValue(v: unknown): unknown {
  if (v === undefined || v === "") return null;
  if (typeof v === "number") return Math.round(v * 100) / 100;
  if (v instanceof Date) return v.toISOString();
  return v;
}

export function contentHash(l: Pick<NormalisedListing, ContentField>): string {
  const ordered = CONTENT_FIELDS.map((k) => [k, canonicalValue(l[k])]);
  return createHash("sha256").update(JSON.stringify(ordered)).digest("hex");
}

/** Lists the content fields whose values differ between an existing DB row and an incoming listing. */
export function changedFields(existing: Record<string, unknown>, incoming: Pick<NormalisedListing, ContentField>): ContentField[] {
  return CONTENT_FIELDS.filter(
    (k) => JSON.stringify(canonicalValue(existing[k])) !== JSON.stringify(canonicalValue(incoming[k])),
  );
}
