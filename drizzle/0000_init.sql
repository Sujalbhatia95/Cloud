CREATE TABLE "admin_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_role_chk" CHECK ("admin_users"."role" in ('admin','editor','agent'))
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"user_email" text,
	"action" text NOT NULL,
	"entity" text,
	"entity_id" text,
	"details" jsonb,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_items" (
	"key" text PRIMARY KEY NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"admin_notes" text,
	"consent_at" timestamp with time zone NOT NULL,
	"consent_version" text NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_messages_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "content_pages" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body_md" text NOT NULL,
	"legal_reviewed" boolean DEFAULT false NOT NULL,
	"review_note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"related_id" uuid,
	"to_address" text NOT NULL,
	"reply_to" text,
	"subject" text NOT NULL,
	"html" text NOT NULL,
	"text_body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"provider" text,
	"provider_message_id" text,
	"next_attempt_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_outbox_status_chk" CHECK ("email_outbox"."status" in ('pending','sending','sent','failed'))
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid,
	"created_by_email" text,
	"filename" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_sha256" text NOT NULL,
	"sheet_name" text,
	"sheet_names" text[] DEFAULT '{}'::text[] NOT NULL,
	"file_data" "bytea",
	"header_row" integer DEFAULT 1 NOT NULL,
	"headers" jsonb NOT NULL,
	"rows" jsonb NOT NULL,
	"mapping" jsonb,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"summary" jsonb,
	"results" jsonb,
	"error" text,
	"confirmed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_batches_status_chk" CHECK ("import_batches"."status" in ('uploaded','previewed','completed','failed','cancelled'))
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"transaction_type" text NOT NULL,
	"property_type" text NOT NULL,
	"category" text NOT NULL,
	"listing_status" text NOT NULL,
	"price" bigint,
	"price_negotiable" boolean DEFAULT false NOT NULL,
	"locality" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"pincode" text,
	"bedrooms" integer,
	"bathrooms" integer,
	"area_value" double precision,
	"area_unit" text,
	"area_type" text,
	"area_sqft" double precision,
	"furnishing_status" text,
	"possession_status" text,
	"available_from" date,
	"floor" text,
	"total_floors" integer,
	"parking" text,
	"facing" text,
	"age_years" integer,
	"maintenance_charges" bigint,
	"security_deposit" bigint,
	"description" text,
	"amenities" text[] DEFAULT '{}'::text[] NOT NULL,
	"image_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"rera_project_number" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"source_updated_at" timestamp with time zone,
	"content_hash" text NOT NULL,
	"source" text DEFAULT 'admin' NOT NULL,
	"last_import_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_transaction_type_chk" CHECK ("listings"."transaction_type" in ('sale','rent')),
	CONSTRAINT "listings_status_chk" CHECK ("listings"."listing_status" in ('active','under_offer','sold','rented','archived','draft')),
	CONSTRAINT "listings_price_chk" CHECK ("listings"."price" is null or "listings"."price" > 0)
);
--> statement-breakpoint
CREATE TABLE "mapping_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"header_signature" text NOT NULL,
	"mapping" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mapping_profiles_header_signature_unique" UNIQUE("header_signature")
);
--> statement-breakpoint
CREATE TABLE "market_comparables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city" text NOT NULL,
	"locality" text NOT NULL,
	"property_type" text NOT NULL,
	"area_sqft" double precision NOT NULL,
	"area_type" text NOT NULL,
	"price" bigint NOT NULL,
	"transaction_date" date NOT NULL,
	"source" text NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"enquiry_type" text NOT NULL,
	"owner_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"preferred_contact" text,
	"address_line" text,
	"locality" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"pincode" text,
	"property_type" text NOT NULL,
	"area_value" double precision,
	"area_unit" text,
	"area_type" text,
	"bedrooms" integer,
	"expected_price" bigint,
	"details" text,
	"valuation_snapshot" jsonb,
	"status" text DEFAULT 'new' NOT NULL,
	"admin_notes" text,
	"consent_at" timestamp with time zone NOT NULL,
	"consent_version" text NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_enquiries_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "showing_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"listing_uuid" uuid,
	"listing_id" text NOT NULL,
	"property_title" text NOT NULL,
	"property_url" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"preferred_date" date NOT NULL,
	"preferred_time" text NOT NULL,
	"flexibility" text NOT NULL,
	"message" text,
	"status" text DEFAULT 'new' NOT NULL,
	"admin_notes" text,
	"consent_at" timestamp with time zone NOT NULL,
	"consent_version" text NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "showing_requests_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showing_requests" ADD CONSTRAINT "showing_requests_listing_uuid_listings_id_fk" FOREIGN KEY ("listing_uuid") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_sessions_user_idx" ON "admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_messages_created_idx" ON "contact_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_outbox_status_idx" ON "email_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "email_outbox_related_idx" ON "email_outbox" USING btree ("related_id");--> statement-breakpoint
CREATE INDEX "import_batches_created_idx" ON "import_batches" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_listing_id_key" ON "listings" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listings_public_idx" ON "listings" USING btree ("listing_status","transaction_type","category");--> statement-breakpoint
CREATE INDEX "listings_city_idx" ON "listings" USING btree (lower("city"));--> statement-breakpoint
CREATE INDEX "listings_price_idx" ON "listings" USING btree ("price");--> statement-breakpoint
CREATE INDEX "listings_created_idx" ON "listings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "market_comparables_lookup_idx" ON "market_comparables" USING btree (lower("city"),"property_type");--> statement-breakpoint
CREATE INDEX "seller_enquiries_created_idx" ON "seller_enquiries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "showing_requests_created_idx" ON "showing_requests" USING btree ("created_at");