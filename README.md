# Shree Krishna Associate — Property Website

A full real-estate website with property search, individual property pages, showing requests, seller enquiries,
a transparent price-estimate calculator, Indian legal/compliance pages, and a secure admin dashboard where staff
upload a weekly CSV/Excel file to manage every listing — no coding needed.

**Stack:** Next.js 16 (App Router, React 19, Cache Components) · TypeScript · Tailwind CSS 4 · PostgreSQL
(Supabase or any Postgres 14+) via Drizzle ORM · Resend or SendGrid for email · ExcelJS / PapaParse / SheetJS for
spreadsheets · Vitest + Playwright for tests.

---

## Contents

1. [What's included](#1-whats-included)
2. [Run it on your computer](#2-run-it-on-your-computer)
3. [Go live (Supabase + Vercel)](#3-go-live-supabase--vercel)
4. [Database](#4-database)
5. [Email notifications](#5-email-notifications)
6. [Staff accounts and roles](#6-staff-accounts-and-roles)
7. [Weekly spreadsheet uploads](#7-weekly-spreadsheet-uploads)
8. [Demo mode and demo images](#8-demo-mode-and-demo-images)
9. [Legal and compliance setup](#9-legal-and-compliance-setup)
10. [Scheduled jobs](#10-scheduled-jobs)
11. [Security](#11-security)
12. [Tests](#12-tests)
13. [Project layout](#13-project-layout)
14. [Known limitations](#14-known-limitations)

---

## 1. What's included

**Public website**

| Page | URL |
|---|---|
| Home — photographic hero, search, featured, recently added, explore by location, seller callback form | `/` |
| Buy / Rent / Commercial search with combined filters, chips, sorting and pagination | `/buy`, `/rent`, `/commercial` |
| Property details — gallery + lightbox, price, specs, amenities, location, disclosures, **Schedule a showing** | `/property/<listing-id>/<slug>` |
| Sell or let your property (owner enquiry) | `/sell` |
| Property estimate calculator | `/valuation` |
| About, Contact | `/about`, `/contact` |
| Privacy Notice, Terms of Use, Disclosures (editable drafts) | `/privacy`, `/terms`, `/disclosures` |
| Sitemap, robots, web manifest | `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` |

Search filters: free-text location (city, locality, state, PIN code, title or listing ID), city, locality, state,
PIN code, buy/rent/commercial, category, property type, min/max price in ₹, bedrooms, bathrooms, min/max area,
furnishing, availability (available now / under construction / include under-offer). Sort by newest, lowest or
highest price. Results show counts, removable filter chips, "clear all", and pages of 12. Every search is a
shareable URL. **Archived, draft, sold and rented listings never appear in search**; sold/rented pages say they are
no longer available; archived/draft pages return "not found".

**Admin dashboard** (`/admin`)

- Dashboard: active listings, new enquiries, failed emails, launch blockers.
- **Spreadsheet imports**: upload `.csv`, `.xlsx`, `.xls` → automatic column matching (and saved mappings for your
  own sheet) → preview of added / updated / unchanged / skipped / rejected rows → explicit confirmation → live.
  Downloadable template (Excel with dropdowns + instructions, CSV) and downloadable error reports.
- Listings: search, change status, feature/unfeature, edit or add single listings, delete (admin only).
- Enquiries & showings: showing requests, owner/seller enquiries and contact messages, with status, notes,
  email-delivery status, retry and permanent erasure.
- Email delivery: outbox with failures, manual retry, test email.
- Valuation data: verified comparable transactions used by the estimate calculator.
- Compliance checklist: automatic launch blockers + items a person/lawyer must confirm.
- Business settings: legal name, address, phone, State/UT, RERA agent registration, brokerage terms, grievance
  officer, data-retention period, **demo mode switch**.
- Legal & page content editor (Markdown) with "reviewed by a lawyer" flag.
- Staff accounts (admin / editor / agent roles), my account (password change), audit log.

---

## 2. Run it on your computer

Requirements: Node.js 20.9+ (22 recommended), pnpm 10, PostgreSQL 14+ (local or a free Supabase project).

```bash
pnpm install
cp .env.example .env.local          # then edit DATABASE_URL, SESSION_SECRET, SITE_URL=http://localhost:3000, DATABASE_SSL=disable, EMAIL_PROVIDER=log
pnpm db:migrate                     # creates the tables
pnpm db:seed                        # default settings + clearly-labelled DEMO listings
pnpm admin:create --email you@example.com --name "Your Name"   # prints a one-time temporary password
pnpm dev                            # http://localhost:3000  ·  admin at http://localhost:3000/admin
```

With `EMAIL_PROVIDER=log`, notification emails are written to the terminal instead of being sent.

---

## 3. Go live (Supabase + Vercel)

These steps take about 30 minutes. Supabase offers a Mumbai (ap-south-1) region and Vercel deploys Next.js natively.

1. **Database** — create a Supabase project (region: *South Asia (Mumbai)*). In *Project → Connect*, copy the
   **Transaction pooler** connection string (port 6543) and the database password.
2. **Run migrations once** from your computer against that database:
   ```bash
   DATABASE_URL="postgres://…:6543/postgres" DATABASE_SSL=no-verify pnpm db:migrate
   DATABASE_URL="…" DATABASE_SSL=no-verify pnpm db:seed          # optional: demo listings
   DATABASE_URL="…" DATABASE_SSL=no-verify pnpm admin:create --email you@example.com --name "Your Name"
   ```
   For strict certificate checking, download Supabase's CA certificate and use `DATABASE_SSL=require` with
   `DATABASE_CA_CERT`.
3. **Email** — set up Resend (see [section 5](#5-email-notifications)).
4. **Deploy** — import the repository in Vercel. Add every variable from `.env.example` under *Settings →
   Environment Variables* (Production). `SITE_URL` must be your final `https://` domain — it is also read at build
   time (page metadata, robots.txt, security headers), so redeploy after changing it. Deploy.
5. **Domain** — add your domain in Vercel → Domains and update DNS as instructed.
6. **Scheduled jobs** — `vercel.json` registers the two cron jobs. Vercel sends `Authorization: Bearer $CRON_SECRET`
   automatically. On Vercel's Hobby plan cron jobs can run at most once a day — either upgrade, change the
   email-retry schedule to daily, or call the endpoint from an external scheduler (see [section 10](#10-scheduled-jobs)).
7. Sign in at `https://your-domain/admin`, change your temporary password, fill in **Business settings**, and work
   through **Compliance checklist** until there are no blockers. Then switch **demo mode off**.

Other hosts work too (any Node.js 20+ server with `pnpm build && pnpm start`, plus a PostgreSQL database).

---

## 4. Database

- Schema: `src/db/schema.ts`. SQL migrations: `drizzle/`. Apply with `pnpm db:migrate`.
- After changing the schema: `pnpm db:generate` to create a new migration, then `pnpm db:migrate`.
- Main tables: `listings` (unique `listing_id`), `import_batches`, `mapping_profiles`, `showing_requests`,
  `seller_enquiries`, `contact_messages`, `email_outbox`, `site_settings`, `content_pages`, `compliance_items`,
  `market_comparables`, `admin_users`, `admin_sessions`, `audit_log`, `rate_limits`.
- Back up regularly (Supabase does daily backups on paid plans; you can also run `pg_dump`).
- Listings live only in the database — never in browser storage or hard-coded files.

---

## 5. Email notifications

Every showing request, owner enquiry and contact message is **saved to the database first**, then emailed to
`NOTIFY_EMAIL` (default **associateshreekrishna775@gmail.com**). Each email contains the customer's details, the
property title and link, the requested date/time and flexibility, their message and the submission time (IST).
The "reply" button in your inbox replies straight to the customer.

If a send fails, the message stays in **Admin → Email delivery** with the error. It is retried automatically
(5 min, 15 min, 1 h, 3 h, 12 h, 24 h) by the cron job and can be retried manually at any time.

### Resend (recommended)

1. Create an account at resend.com.
2. **Domains → Add domain** (e.g. `your-domain.in`) and add the DNS records it shows (SPF/DKIM). Wait until verified.
3. **API keys → Create** (permission: *Sending access*).
4. Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=re_…`, `EMAIL_FROM="Shree Krishna Associate <enquiries@your-domain.in>"`.
5. Admin → Email delivery → **Send test email**, then check the Gmail inbox (and spam folder the first time —
   mark it "Not spam").

> Before your domain is verified, Resend only lets you send *to the email address of your own Resend account*
> from `onboarding@resend.dev`. If you sign up to Resend with associateshreekrishna775@gmail.com you can test
> immediately with `EMAIL_FROM="Shree Krishna Associate <onboarding@resend.dev>"`. Use a verified domain for production.

### SendGrid (alternative)

Verify a sender or domain in SendGrid, create an API key with *Mail Send* permission, then set
`EMAIL_PROVIDER=sendgrid`, `SENDGRID_API_KEY=SG.…` and `EMAIL_FROM`.

Credentials are read only from environment variables on the server; they are never sent to browsers, stored in the
database, or editable from the admin. The notification address is also environment-only, so an admin account
cannot silently redirect your leads.

---

## 6. Staff accounts and roles

| Role | Can do | Cannot do |
|---|---|---|
| **admin** | Everything, including users, settings, legal content, compliance, deleting data | — |
| **editor** | Listings, spreadsheet imports, valuation data | See customer enquiries or emails, change settings |
| **agent** | Enquiries & showings, email retries, read listings | Import or edit listings, change settings |

Create the first admin with `pnpm admin:create`. Further accounts: Admin → Staff accounts (a temporary password is
shown once; the person must change it at first sign-in). Passwords: 12+ characters, mixed character types, stored
with scrypt. Accounts lock for 15 minutes after 5 wrong passwords; sign-in attempts are rate-limited per IP.
Sessions last 12 hours and are stored server-side (revocable). All admin actions are written to the audit log.

---

## 7. Weekly spreadsheet uploads

Full guide for staff: **[docs/SPREADSHEET_GUIDE.md](docs/SPREADSHEET_GUIDE.md)**. Templates: `docs/templates/`
(also downloadable from Admin → Spreadsheet imports).

How it works:

1. **Upload** `.csv`, `.xlsx` or `.xls` (max 4 MB / 5,000 rows). Nothing changes yet.
2. **Match columns.** Common names ("Property ID", "Expected Price (₹)", "BHK", "Location"…) are recognised
   automatically; adjust any dropdown and optionally save the mapping — next week it is applied automatically.
3. **Preview.** Every row is validated and compared with the website: *to add*, *to update* (with the changed
   fields), *unchanged*, *skipped* (e.g. older than the website's version via `last_updated`) or *rejected* (with
   reasons). Download the error report to fix your sheet.
4. **Confirm.** Tick the confirmation box and press *Confirm import*. Optionally: "only import if every row is valid".

Rules that keep your data safe:

- Rows are matched by **`listing_id`**: same ID = update that listing in place, new ID = new listing. Duplicate IDs
  in one file are rejected. Repeat uploads never create duplicates.
- Listings that are **missing from a file are never deleted or changed**. To take a property down, set
  `listing_status` to *Archived*, *Sold* or *Rented*.
- The import runs inside **one database transaction**: if anything fails part-way, nothing is changed.
- Formulas are never executed (only their saved values are read); zip-bomb, size and row limits are enforced.
- Changes appear on the live website as soon as you confirm.

---

## 8. Demo mode and demo images

`pnpm db:seed` adds 12 demo listings with IDs `DEMO-101`…`DEMO-112`. They are marked **Demo listing** everywhere,
their descriptions say they are fictional, they are excluded from the sitemap and marked `noindex`, and the
estimate calculator never uses them. A site-wide banner explains demo mode.

**Before launch:** Admin → Business settings → Demo mode → *Turn demo mode off* (hides all demo content), and
optionally *Delete all demo listings*.

The demo images in `public/demo/` are **original computer-generated renders created for this project** with Blender
(scripts in `scripts/render/`). They contain no third-party photographs, so there is no licence to clear. They are
captioned as illustrative CGI. To re-render: `python -m pip install bpy==5.2.3` then
`BLENDER_PYTHON=python scripts/render/render_all.sh`. Replace `public/demo/hero.jpg` to change the home-page hero.

Use only photographs you own or are licensed to use for real listings.

---

## 9. Legal and compliance setup

Read **[docs/COMPLIANCE_NOTES.md](docs/COMPLIANCE_NOTES.md)** and work through **[docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md)**.

- Nothing has been invented: missing details (address, phone, RERA registration, brokerage terms, grievance
  officer…) appear on the website as highlighted placeholders such as
  **[DEMO ONLY — INSERT VERIFIED RERA DETAILS IF APPLICABLE]** until you enter verified information in
  Admin → Business settings.
- The Privacy Notice, Terms and Disclosures are **drafts for review by a qualified lawyer** and show a "Draft for
  legal review" banner until marked reviewed in Admin → Legal & page content.
- Admin → Compliance checklist lists every launch blocker. **It is a preparation aid, not legal advice, and does not
  guarantee compliance.**

---

## 10. Scheduled jobs

| Endpoint | Purpose | Suggested schedule |
|---|---|---|
| `GET /api/cron/email-retry` | Retries failed notification emails | Every 15 minutes |
| `GET /api/cron/maintenance` | Deletes enquiries older than the retention period, expired sessions, old rate-limit rows | Daily |

Both require the header `Authorization: Bearer <CRON_SECRET>`. External scheduler example:
`curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.in/api/cron/email-retry`.
Health check for uptime monitors: `GET /api/health`.

---

## 11. Security

- Admin protected by server-side sessions (random token in an httpOnly, SameSite cookie; only its SHA-256 hash is
  stored), a proxy pre-check, and a permission check in **every** admin page, server action and API route.
- Server Actions are protected from cross-site requests by Next.js origin checks; cookies are SameSite=Lax.
- Public forms: server-side validation (Zod), honeypot, signed timing token (rejects bot-speed submissions and
  forged/replayed forms), per-IP database rate limits, optional Cloudflare Turnstile.
- Personal data minimisation: only fields needed to respond are collected; IP addresses are stored only as keyed
  hashes; editors cannot see enquiries; enquiries are auto-deleted after the retention period; individual erasure.
- Security headers: Content-Security-Policy, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy,
  HSTS (https). Admin and API responses are `noindex`; admin pages are `no-store`.
- Spreadsheet parsing in memory with size/row/column/zip-expansion limits; formulas never evaluated; CSV reports
  are protected against formula injection.
- Secrets only in environment variables. `.env*` files are git-ignored (except `.env.example`).

---

## 12. Tests

```bash
pnpm test               # unit tests (parsers, validation)
pnpm test:integration   # against PostgreSQL: imports, search, enquiries + email (TEST_DATABASE_URL, default …/ska_test)
pnpm test:e2e           # builds the site and runs Playwright browser tests (database ska_e2e, mock email server)
```

The integration tests need an empty, migrated test database (the E2E suite creates its own):

```bash
createdb ska_test
DATABASE_URL=postgres://postgres:pgdevpass@127.0.0.1:5432/ska_test npx tsx scripts/migrate.ts
```

The end-to-end suite uses a local mock of the Resend API, so it proves that each request is sent to the provider
with the right recipient and content — **it does not prove delivery to a real inbox**. After configuring your real
API key, use Admin → Email delivery → *Send test email* and confirm it arrives. See
[docs/ACCEPTANCE_TESTS.md](docs/ACCEPTANCE_TESTS.md) for what each acceptance criterion is checked by.

---

## 13. Project layout

```
src/app/(site)/        public pages          src/app/admin/        admin pages + server actions
src/app/api/           template/report downloads, cron, health
src/components/        UI (site, property, search, forms, admin)
src/db/                Drizzle schema + client               drizzle/   SQL migrations
src/lib/listings/      vocabularies, parsers, validation, search queries, formatting
src/lib/import/        file parsing, zip guard, column mapping, preview, transactional commit, template, reports
src/lib/auth/          passwords, sessions, roles, guards     src/lib/email/  provider, templates, outbox
src/lib/forms/         validation schemas, spam checks, rate limits
src/lib/content/       default legal page drafts              src/lib/compliance.ts  launch checklist
scripts/               migrate, seed, create-admin, generate-templates, render/ (Blender)
tests/                 unit, integration, e2e (Playwright)    docs/   guides + templates
```

---

## 14. Known limitations

- **Real email delivery was not tested from the build environment** (outbound access to email providers was not
  available there). Delivery logic was verified against a Resend-compatible mock; send a test email after setup.
- `.xls` (Excel 97–2003) files are read with SheetJS Community Edition from the `@e965/xlsx` npm package — an
  automated, provenance-signed republish of the official SheetJS release. SheetJS's own CDN was not reachable from
  the build environment. To use the official package instead:
  `pnpm remove @e965/xlsx && pnpm add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` and change the import in
  `src/lib/import/parse-file.ts` to `xlsx`. `.csv` and `.xlsx` do not depend on it.
- The estimate calculator gives meaningful ranges only after you enter verified comparable sales (or have at least
  three real listings of the same type in a city). Until then it says so, or shows an illustrative calculation
  based on a rate the visitor enters.
- Legal texts are drafts. They must be reviewed by a lawyer familiar with your State/UT before launch.
- Map embeds are not included (a "view area on Google Maps" link is provided) to avoid API keys and exact-address
  disclosure.
