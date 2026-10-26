/**
 * Canonical vocabularies for listings. Spreadsheet values are normalised to these keys
 * (see normalize.ts), and the website displays the labels.
 */

export const TRANSACTION_TYPES = {
  sale: "For Sale",
  rent: "For Rent",
} as const;
export type TransactionType = keyof typeof TRANSACTION_TYPES;

export const LISTING_STATUSES = {
  active: "Available",
  under_offer: "Under offer",
  sold: "Sold",
  rented: "Rented",
  archived: "Archived",
  draft: "Draft (hidden)",
} as const;
export type ListingStatus = keyof typeof LISTING_STATUSES;

/** Statuses that may appear on the public website at all. */
export const PUBLIC_VISIBLE_STATUSES: ListingStatus[] = ["active", "under_offer", "sold", "rented"];
/** Statuses that appear in search results. Only `active` by default; `under_offer` when the visitor opts in. */
export const SEARCHABLE_STATUSES: ListingStatus[] = ["active"];

export const CATEGORIES = {
  residential: "Residential",
  commercial: "Commercial",
  land: "Plots & Land",
} as const;
export type Category = keyof typeof CATEGORIES;

export const PROPERTY_TYPES = {
  apartment: { label: "Apartment / Flat", category: "residential" },
  independent_house: { label: "Independent House", category: "residential" },
  villa: { label: "Villa", category: "residential" },
  builder_floor: { label: "Builder Floor", category: "residential" },
  penthouse: { label: "Penthouse", category: "residential" },
  studio: { label: "Studio Apartment", category: "residential" },
  row_house: { label: "Row House", category: "residential" },
  farm_house: { label: "Farm House", category: "residential" },
  residential_plot: { label: "Residential Plot", category: "land" },
  commercial_plot: { label: "Commercial Plot", category: "land" },
  agricultural_land: { label: "Agricultural Land", category: "land" },
  industrial_land: { label: "Industrial Land", category: "land" },
  office: { label: "Office Space", category: "commercial" },
  shop: { label: "Shop", category: "commercial" },
  showroom: { label: "Showroom", category: "commercial" },
  warehouse: { label: "Warehouse / Godown", category: "commercial" },
  industrial_shed: { label: "Industrial Shed", category: "commercial" },
  coworking: { label: "Co-working Space", category: "commercial" },
  hotel: { label: "Hotel / Guest House", category: "commercial" },
} as const satisfies Record<string, { label: string; category: Category }>;
export type PropertyType = keyof typeof PROPERTY_TYPES;

export const FURNISHING = {
  unfurnished: "Unfurnished",
  semi_furnished: "Semi-furnished",
  fully_furnished: "Fully furnished",
} as const;
export type Furnishing = keyof typeof FURNISHING;

export const POSSESSION = {
  ready_to_move: "Ready to move",
  under_construction: "Under construction",
} as const;
export type Possession = keyof typeof POSSESSION;

export const AREA_TYPES = {
  carpet: "Carpet area",
  built_up: "Built-up area",
  super_built_up: "Super built-up area",
  plot: "Plot area",
} as const;
export type AreaType = keyof typeof AREA_TYPES;

/** Square feet per unit. "Bigha", "guntha" etc. are deliberately excluded because they vary by state. */
export const AREA_UNITS = {
  sqft: { label: "sq ft", toSqft: 1 },
  sqm: { label: "sq m", toSqft: 10.7639104 },
  sqyd: { label: "sq yd", toSqft: 9 },
  acre: { label: "acre", toSqft: 43560 },
  hectare: { label: "hectare", toSqft: 107639.104 },
} as const;
export type AreaUnit = keyof typeof AREA_UNITS;

/** Indian states and union territories (for jurisdiction settings and validation hints). */
export const INDIAN_STATES_AND_UTS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export const SORT_OPTIONS = {
  newest: "Newest first",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
} as const;
export type SortOption = keyof typeof SORT_OPTIONS;

export const PAGE_SIZE = 12;
