import { sql } from "drizzle-orm";
import {
  customType,
  bigint,
  bigserial,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/* ------------------------------------------------------------------ */
/* Listings                                                            */
/* ------------------------------------------------------------------ */

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Business key from the spreadsheet, normalised to upper case. Unique. */
    listingId: text("listing_id").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    transactionType: text("transaction_type").notNull(),
    propertyType: text("property_type").notNull(),
    category: text("category").notNull(),
    listingStatus: text("listing_status").notNull(),
    /** Whole rupees. Monthly rent for rentals. NULL = "Price on request". */
    price: bigint("price", { mode: "number" }),
    priceNegotiable: boolean("price_negotiable").notNull().default(false),
    locality: text("locality").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    pincode: text("pincode"),
    bedrooms: integer("bedrooms"),
    bathrooms: integer("bathrooms"),
    areaValue: doublePrecision("area_value"),
    areaUnit: text("area_unit"),
    areaType: text("area_type"),
    /** Area converted to square feet for filtering / comparisons. */
    areaSqft: doublePrecision("area_sqft"),
    furnishingStatus: text("furnishing_status"),
    possessionStatus: text("possession_status"),
    availableFrom: date("available_from", { mode: "string" }),
    floor: text("floor"),
    totalFloors: integer("total_floors"),
    parking: text("parking"),
    facing: text("facing"),
    ageYears: integer("age_years"),
    maintenanceCharges: bigint("maintenance_charges", { mode: "number" }),
    securityDeposit: bigint("security_deposit", { mode: "number" }),
    description: text("description"),
    amenities: text("amenities").array().notNull().default(sql`'{}'::text[]`),
    imageUrls: text("image_urls").array().notNull().default(sql`'{}'::text[]`),
    featured: boolean("featured").notNull().default(false),
    reraProjectNumber: text("rera_project_number"),
    isDemo: boolean("is_demo").notNull().default(false),
    /** `last_updated` value supplied in the spreadsheet, if any. */
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    /** Hash of all content fields; used to detect unchanged rows on re-import. */
    contentHash: text("content_hash").notNull(),
    source: text("source").notNull().default("admin"),
    lastImportId: uuid("last_import_id"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("listings_listing_id_key").on(t.listingId),
    index("listings_public_idx").on(t.listingStatus, t.transactionType, t.category),
    index("listings_city_idx").on(sql`lower(${t.city})`),
    index("listings_price_idx").on(t.price),
    index("listings_created_idx").on(t.createdAt),
    check("listings_transaction_type_chk", sql`${t.transactionType} in ('sale','rent')`),
    check(
      "listings_status_chk",
      sql`${t.listingStatus} in ('active','under_offer','sold','rented','archived','draft')`,
    ),
    check("listings_price_chk", sql`${t.price} is null or ${t.price} > 0`),
  ],
);

/* ------------------------------------------------------------------ */
/* Admin users, sessions, audit                                        */
/* ------------------------------------------------------------------ */

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("admin_users_email_key").on(t.email),
    check("admin_users_role_chk", sql`${t.role} in ('admin','editor','agent')`),
  ],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    /** SHA-256 of the random session token; the raw token only lives in the user's cookie. */
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
  },
  (t) => [index("admin_sessions_user_idx").on(t.userId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id").references(() => adminUsers.id, { onDelete: "set null" }),
    userEmail: text("user_email"),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    details: jsonb("details"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Spreadsheet imports                                                 */
/* ------------------------------------------------------------------ */

export type ImportSummary = {
  total: number;
  added: number;
  updated: number;
  unchanged: number;
  skipped: number;
  rejected: number;
  /** Empty rows ignored in the file (informational). */
  blank?: number;
};

export type ImportRowResult = {
  row: number;
  listingId: string | null;
  outcome: "add" | "update" | "unchanged" | "skipped" | "rejected";
  errors: string[];
  warnings: string[];
  changedFields: string[];
};

export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdBy: uuid("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdByEmail: text("created_by_email"),
    filename: text("filename").notNull(),
    fileType: text("file_type").notNull(),
    fileSize: integer("file_size").notNull(),
    fileSha256: text("file_sha256").notNull(),
    sheetName: text("sheet_name"),
    sheetNames: text("sheet_names").array().notNull().default(sql`'{}'::text[]`),
    /** Original upload, kept only until the import is completed or cancelled (needed to switch sheets). */
    fileData: bytea("file_data"),
    /** 1-based spreadsheet row number of the header row. */
    headerRow: integer("header_row").notNull().default(1),
    headers: jsonb("headers").$type<string[]>().notNull(),
    rows: jsonb("rows").$type<string[][]>().notNull(),
    /** canonical field -> source column index */
    mapping: jsonb("mapping").$type<Record<string, number>>(),
    status: text("status").notNull().default("uploaded"),
    summary: jsonb("summary").$type<ImportSummary>(),
    results: jsonb("results").$type<ImportRowResult[]>(),
    error: text("error"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("import_batches_created_idx").on(t.createdAt),
    check(
      "import_batches_status_chk",
      sql`${t.status} in ('uploaded','previewed','completed','failed','cancelled')`,
    ),
  ],
);

export const mappingProfiles = pgTable("mapping_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Normalised, sorted header list joined with "|" so a weekly file with the same columns is recognised. */
  headerSignature: text("header_signature").notNull().unique(),
  /** canonical field -> source header text */
  mapping: jsonb("mapping").$type<Record<string, string>>().notNull(),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* Customer enquiries (personal data — admin/agent access only)        */
/* ------------------------------------------------------------------ */

const consentColumns = {
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
  consentVersion: text("consent_version").notNull(),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  ipHash: text("ip_hash"),
};

export const showingRequests = pgTable(
  "showing_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),
    listingUuid: uuid("listing_uuid").references(() => listings.id, { onDelete: "set null" }),
    listingId: text("listing_id").notNull(),
    propertyTitle: text("property_title").notNull(),
    propertyUrl: text("property_url").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    preferredDate: date("preferred_date", { mode: "string" }).notNull(),
    preferredTime: text("preferred_time").notNull(),
    flexibility: text("flexibility").notNull(),
    message: text("message"),
    status: text("status").notNull().default("new"),
    adminNotes: text("admin_notes"),
    ...consentColumns,
    ...timestamps,
  },
  (t) => [index("showing_requests_created_idx").on(t.createdAt)],
);

export const sellerEnquiries = pgTable(
  "seller_enquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),
    enquiryType: text("enquiry_type").notNull(),
    ownerName: text("owner_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    preferredContact: text("preferred_contact"),
    addressLine: text("address_line"),
    locality: text("locality").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    pincode: text("pincode"),
    propertyType: text("property_type").notNull(),
    areaValue: doublePrecision("area_value"),
    areaUnit: text("area_unit"),
    areaType: text("area_type"),
    bedrooms: integer("bedrooms"),
    expectedPrice: bigint("expected_price", { mode: "number" }),
    details: text("details"),
    valuationSnapshot: jsonb("valuation_snapshot"),
    status: text("status").notNull().default("new"),
    adminNotes: text("admin_notes"),
    ...consentColumns,
    ...timestamps,
  },
  (t) => [index("seller_enquiries_created_idx").on(t.createdAt)],
);

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("new"),
    adminNotes: text("admin_notes"),
    ...consentColumns,
    ...timestamps,
  },
  (t) => [index("contact_messages_created_idx").on(t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Email outbox                                                        */
/* ------------------------------------------------------------------ */

export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    relatedId: uuid("related_id"),
    toAddress: text("to_address").notNull(),
    replyTo: text("reply_to"),
    subject: text("subject").notNull(),
    html: text("html").notNull(),
    textBody: text("text_body").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("email_outbox_status_idx").on(t.status, t.nextAttemptAt),
    index("email_outbox_related_idx").on(t.relatedId),
    check("email_outbox_status_chk", sql`${t.status} in ('pending','sending','sent','failed')`),
  ],
);

/* ------------------------------------------------------------------ */
/* Site settings, editable pages, compliance                           */
/* ------------------------------------------------------------------ */

export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

export const contentPages = pgTable("content_pages", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  bodyMd: text("body_md").notNull(),
  legalReviewed: boolean("legal_reviewed").notNull().default(false),
  reviewNote: text("review_note"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

export const complianceItems = pgTable("compliance_items", {
  key: text("key").primaryKey(),
  done: boolean("done").notNull().default(false),
  note: text("note"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

/* ------------------------------------------------------------------ */
/* Valuation comparables (verified transactions entered by staff)      */
/* ------------------------------------------------------------------ */

export const marketComparables = pgTable(
  "market_comparables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    city: text("city").notNull(),
    locality: text("locality").notNull(),
    propertyType: text("property_type").notNull(),
    areaSqft: doublePrecision("area_sqft").notNull(),
    areaType: text("area_type").notNull(),
    price: bigint("price", { mode: "number" }).notNull(),
    transactionDate: date("transaction_date", { mode: "string" }).notNull(),
    source: text("source").notNull(),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("market_comparables_lookup_idx").on(sql`lower(${t.city})`, t.propertyType)],
);

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/* ------------------------------------------------------------------ */

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type ImportBatch = typeof importBatches.$inferSelect;
export type ShowingRequest = typeof showingRequests.$inferSelect;
export type SellerEnquiry = typeof sellerEnquiries.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type EmailOutboxRow = typeof emailOutbox.$inferSelect;
export type MarketComparable = typeof marketComparables.$inferSelect;
