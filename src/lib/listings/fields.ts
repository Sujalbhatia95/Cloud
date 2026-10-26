/**
 * The canonical spreadsheet columns. Used by the import column-mapper, the downloadable
 * template, the admin listing form and the documentation.
 */
export type ListingFieldKey =
  | "listing_id"
  | "title"
  | "transaction_type"
  | "property_type"
  | "listing_status"
  | "price"
  | "price_negotiable"
  | "locality"
  | "city"
  | "state"
  | "pincode"
  | "bedrooms"
  | "bathrooms"
  | "area_value"
  | "area_unit"
  | "area_type"
  | "furnishing_status"
  | "possession_status"
  | "available_from"
  | "floor"
  | "total_floors"
  | "parking"
  | "facing"
  | "age_years"
  | "maintenance_charges"
  | "security_deposit"
  | "description"
  | "amenities"
  | "image_urls"
  | "featured"
  | "rera_project_number"
  | "last_updated";

export type ListingFieldDef = {
  key: ListingFieldKey;
  label: string;
  required: boolean;
  /** Part of the suggested core column set from the brief. */
  core: boolean;
  example: string;
  help: string;
  /** Alternative header names recognised automatically (compared case/punctuation-insensitively). */
  synonyms: string[];
};

export const LISTING_FIELDS: ListingFieldDef[] = [
  {
    key: "listing_id", label: "Listing ID", required: true, core: true, example: "SKA-1001",
    help: "Your unique reference for the property. Re-uploading the same ID updates that listing instead of creating a duplicate. Letters, numbers, - _ . only.",
    synonyms: ["id", "property id", "listing no", "listing number", "ref", "ref no", "reference", "reference no", "reference number", "property code", "code", "unique id", "property ref"],
  },
  {
    key: "title", label: "Title", required: true, core: true, example: "3 BHK apartment with garden view",
    help: "Headline shown on the website (5–150 characters).",
    synonyms: ["property title", "name", "property name", "heading", "headline", "listing title"],
  },
  {
    key: "transaction_type", label: "Transaction type", required: true, core: true, example: "Sale",
    help: "Sale or Rent (also understands Buy, Resale, Lease, To let).",
    synonyms: ["transaction", "deal type", "for", "sale or rent", "sale rent", "listing type", "purpose", "type of deal", "deal"],
  },
  {
    key: "property_type", label: "Property type", required: true, core: true, example: "Apartment",
    help: "Apartment, Independent House, Villa, Builder Floor, Penthouse, Studio, Row House, Farm House, Residential Plot, Commercial Plot, Agricultural Land, Industrial Land, Office, Shop, Showroom, Warehouse, Industrial Shed, Co-working, Hotel.",
    synonyms: ["type", "property", "category", "unit type", "property category", "ptype"],
  },
  {
    key: "listing_status", label: "Listing status", required: true, core: true, example: "Active",
    help: "Active (shown on website), Under offer, Sold, Rented, Archived (hidden) or Draft (hidden).",
    synonyms: ["status", "availability status", "listing state", "state of listing", "live"],
  },
  {
    key: "price", label: "Price (INR)", required: true, core: true, example: "1.25 Cr",
    help: "Sale price, or monthly rent for rentals. Accepts 12500000, 1,25,00,000, 125 Lakh, 1.25 Cr, 25k. Write \"Price on request\" to hide the price.",
    synonyms: ["price inr", "price rs", "amount", "expected price", "asking price", "rent", "monthly rent", "rate", "cost", "price in rs", "price rupees", "total price", "quoted price"],
  },
  {
    key: "price_negotiable", label: "Price negotiable", required: false, core: false, example: "Yes",
    help: "Yes or No.", synonyms: ["negotiable"],
  },
  {
    key: "locality", label: "Locality", required: true, core: true, example: "Baner",
    help: "Neighbourhood / sector / area name.",
    synonyms: ["area name", "neighbourhood", "neighborhood", "sector", "location", "society area", "micro market", "suburb", "colony"],
  },
  {
    key: "city", label: "City", required: true, core: true, example: "Pune",
    help: "City or town.", synonyms: ["town", "city name", "district"],
  },
  {
    key: "state", label: "State / UT", required: true, core: true, example: "Maharashtra",
    help: "Indian state or union territory (abbreviations like MH, UP, DL are understood).",
    synonyms: ["state ut", "province", "state name"],
  },
  {
    key: "pincode", label: "PIN code", required: false, core: true, example: "411045",
    help: "6-digit PIN code.", synonyms: ["pin", "pin code", "postal code", "zip", "zip code", "postcode"],
  },
  {
    key: "bedrooms", label: "Bedrooms", required: false, core: true, example: "3",
    help: "Number of bedrooms (\"3 BHK\" is understood).", synonyms: ["beds", "bhk", "bedroom", "no of bedrooms", "rooms", "configuration"],
  },
  {
    key: "bathrooms", label: "Bathrooms", required: false, core: true, example: "3",
    help: "Number of bathrooms.", synonyms: ["baths", "bathroom", "toilets", "washrooms", "no of bathrooms"],
  },
  {
    key: "area_value", label: "Area", required: false, core: true, example: "1250",
    help: "Area as a number.", synonyms: ["area", "size", "area sq ft", "area sqft", "carpet area", "built up area", "super area", "plot area", "sq ft", "sqft", "square feet", "area size"],
  },
  {
    key: "area_unit", label: "Area unit", required: false, core: true, example: "sqft",
    help: "sqft, sqm, sqyd (gaj), acre or hectare. State-specific units such as bigha must be converted.",
    synonyms: ["unit", "area units", "uom", "measurement unit"],
  },
  {
    key: "area_type", label: "Area type", required: false, core: true, example: "Carpet",
    help: "Carpet, Built-up, Super built-up or Plot. RERA-registered projects must be marketed on carpet area.",
    synonyms: ["area basis", "area measure", "measurement type"],
  },
  {
    key: "furnishing_status", label: "Furnishing", required: false, core: true, example: "Semi-furnished",
    help: "Unfurnished, Semi-furnished or Fully furnished.", synonyms: ["furnishing", "furnished", "furniture"],
  },
  {
    key: "possession_status", label: "Possession", required: false, core: false, example: "Ready to move",
    help: "Ready to move or Under construction.", synonyms: ["possession", "construction status", "property status", "availability", "ready status"],
  },
  {
    key: "available_from", label: "Available from", required: false, core: false, example: "01-12-2026",
    help: "Date the property is available (DD-MM-YYYY).", synonyms: ["available date", "availability date", "possession date", "move in date", "vacant from"],
  },
  { key: "floor", label: "Floor", required: false, core: false, example: "7", help: "Floor number, e.g. 7 or Ground.", synonyms: ["floor no", "floor number", "on floor"] },
  { key: "total_floors", label: "Total floors", required: false, core: false, example: "14", help: "Floors in the building.", synonyms: ["floors", "no of floors", "building floors", "total floor"] },
  { key: "parking", label: "Parking", required: false, core: false, example: "1 covered", help: "Parking details.", synonyms: ["car parking", "parking slots", "covered parking"] },
  { key: "facing", label: "Facing", required: false, core: false, example: "East", help: "Direction the property faces.", synonyms: ["direction", "orientation", "entrance facing"] },
  { key: "age_years", label: "Age (years)", required: false, core: false, example: "5", help: "Age of the construction in years.", synonyms: ["age", "property age", "age of property", "building age"] },
  { key: "maintenance_charges", label: "Maintenance (₹/month)", required: false, core: false, example: "4500", help: "Monthly maintenance charges.", synonyms: ["maintenance", "monthly maintenance", "society charges", "cam charges"] },
  { key: "security_deposit", label: "Security deposit (₹)", required: false, core: false, example: "1.5 Lakh", help: "For rentals.", synonyms: ["deposit", "security", "advance"] },
  {
    key: "description", label: "Description", required: false, core: true, example: "Well-lit corner apartment…",
    help: "Full description (up to 5,000 characters).", synonyms: ["details", "property description", "about", "remarks", "notes", "summary"],
  },
  {
    key: "amenities", label: "Amenities", required: false, core: true, example: "Lift; Gym; Swimming pool; Power backup",
    help: "Separate items with ; or | or commas.", synonyms: ["features", "facilities", "amenity", "highlights"],
  },
  {
    key: "image_urls", label: "Image URLs", required: false, core: true, example: "https://…/photo1.jpg | https://…/photo2.jpg",
    help: "https links separated by | or new lines. Google Drive links work if the file is shared with \"Anyone with the link\". Only use photos you own or are licensed to use.",
    synonyms: ["images", "image", "photos", "photo urls", "image links", "pictures", "photo links", "image url", "gallery"],
  },
  { key: "featured", label: "Featured", required: false, core: true, example: "No", help: "Yes to show on the home page.", synonyms: ["is featured", "highlight", "premium", "featured listing"] },
  {
    key: "rera_project_number", label: "RERA project no.", required: false, core: true, example: "",
    help: "The project's registration number exactly as shown on the State RERA website. Leave blank if not applicable — never guess.",
    synonyms: ["rera", "rera no", "rera number", "rera registration", "rera id", "rera registration no", "project rera", "rera reg no"],
  },
  {
    key: "last_updated", label: "Last updated", required: false, core: true, example: "25-10-2026",
    help: "When this row was last edited. Rows older than the version already on the website are skipped.",
    synonyms: ["updated", "updated on", "last modified", "modified", "date updated", "updated at", "last update", "date"],
  },
];

export const FIELD_BY_KEY = Object.fromEntries(LISTING_FIELDS.map((f) => [f.key, f])) as Record<ListingFieldKey, ListingFieldDef>;
export const REQUIRED_FIELDS = LISTING_FIELDS.filter((f) => f.required).map((f) => f.key);
