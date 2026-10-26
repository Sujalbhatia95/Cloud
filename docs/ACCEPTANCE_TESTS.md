# Acceptance tests

How each acceptance criterion from the brief is verified, and the latest results. Re-run any time:

```bash
pnpm test               # unit
pnpm test:integration   # PostgreSQL integration (database ska_test)
pnpm test:e2e           # production build + Playwright (database ska_e2e, mock Resend server on :4010)
```

| # | Criterion | Verified by |
|---|---|---|
| 1 | CSV and Excel uploads work | `tests/integration/import.test.ts` (CSV, .xlsx with title row and custom headings, .xls, filled-in template) · `tests/e2e/01-admin-import.spec.ts` (CSV, .xlsx and .xls through the real admin UI: upload → map → preview → confirm → visible on the site) |
| 2 | Repeated uploads do not create duplicates | integration "repeated uploads…" (CSV then CSV then XLSX → 3 rows) · e2e "uploading the same file again creates no duplicates" (30 unchanged, DB identical, no duplicate IDs) |
| 3 | Updated listings replace matching records correctly | integration "updates matching listings…" (same record id updated in place, only changed fields, missing listings untouched) · e2e "Excel upload with the owner's own column names updates matching listings" (price change visible on the property page; sold listing leaves search) · e2e "listings missing from a weekly file are left untouched" |
| 4 | Invalid imports do not corrupt existing data | integration: invalid rows rejected with reasons; strict mode; **simulated failure part-way through the transaction rolls back completely**; double-confirm refused; unsafe files refused; formulas never evaluated · e2e: fake .xlsx refused; strict import with a bad row changes nothing; downloadable error report |
| 5 | Search and filters work against the database | `tests/integration/search.test.ts` (transaction type, category, location fields, free text, price, bedrooms, bathrooms, area, type, furnishing, availability, sorting, pagination, malicious parameters) · e2e search/sort/pagination/clear-filters |
| 6 | Showing requests are saved and emailed to associateshreekrishna775@gmail.com | `tests/integration/enquiries.test.ts` and `tests/e2e/02-showing.spec.ts`: row saved with all fields; request sent to the provider API (Resend format) with `to: associateshreekrishna775@gmail.com`, reply-to the customer, property title + URL, requested date/time, flexibility, message and IST timestamp; confirmation says it is **not** a confirmed appointment; failed delivery recorded and retried (automatic and manual) |
| 7 | Admin routes and private enquiries are protected | `tests/e2e/03-security.spec.ts`: signed-out access to every admin page/API redirects or returns 401; forged cookies rejected; generic login errors; editor cannot see enquiries/settings; agent cannot import or change settings; logout ends the session; cron needs its secret; security/noindex/no-store headers |
| 8 | Demo listings and unverified credentials are clearly labelled | e2e: demo banner, "Demo listing" badges, demo notice on property pages, `[DEMO ONLY — INSERT VERIFIED RERA DETAILS IF APPLICABLE]` placeholders, "Draft for legal review" banners; demo-mode switch hides all demo content; sitemap excludes demo; compliance checklist reports blockers |
| 9 | All forms, buttons, links and mobile layouts work | e2e: showing, seller and contact forms; valuation calculator; hero search; filters; admin forms (`07-admin-forms.spec.ts`: business settings, listing editor, quick status/featured buttons, add listing, verified comparables, legal content editor, staff accounts with forced password change); link and image crawl of all public pages; sitemap; mobile (Pixel 7): no horizontal overflow on 12 pages, full-screen menu, filter drawer, sticky showing button; automated accessibility checks (`06-accessibility.spec.ts`, axe-core WCAG 2.1 A/AA, no serious/critical violations on 10 pages) |

**Important:** the email tests use a local mock of the Resend API. They prove the website sends each notification
to the provider with the correct recipient and content, and handles failures — they cannot prove delivery into the
Gmail inbox. After adding your real API key, use **Admin → Email delivery → Send test email**.

## Latest results

Run on 26 Oct 2026 against a production build (`next build` + `next start`), PostgreSQL 16, Chromium (desktop 1440×900 and Pixel 7 emulation):

| Suite | Result |
|---|---|
| Unit (`pnpm test`) | **29 / 29 passed** |
| Integration (`pnpm test:integration`) | **30 / 30 passed** |
| End-to-end (`pnpm test:e2e`) | **65 / 65 passed** |
| ESLint | no errors |
| TypeScript (`tsc --noEmit`) | no errors |
| `pnpm audit --prod` | no known vulnerabilities |

### End-to-end tests

- ✅ `01-admin-import.spec.ts` (desktop) — weekly spreadsheet uploads › downloadable templates are available to signed-in staff
- ✅ `01-admin-import.spec.ts` (desktop) — weekly spreadsheet uploads › CSV upload: map, preview, confirm — listings go live
- ✅ `01-admin-import.spec.ts` (desktop) — weekly spreadsheet uploads › uploading the same file again creates no duplicates
- ✅ `01-admin-import.spec.ts` (desktop) — weekly spreadsheet uploads › Excel upload with the owner's own column names updates matching listings
- ✅ `01-admin-import.spec.ts` (desktop) — weekly spreadsheet uploads › legacy .xls files can be imported
- ✅ `01-admin-import.spec.ts` (desktop) — weekly spreadsheet uploads › invalid files and rows never corrupt existing data
- ✅ `01-admin-import.spec.ts` (desktop) — weekly spreadsheet uploads › listings missing from a weekly file are left untouched (never auto-deleted)
- ✅ `02-showing.spec.ts` (desktop) — a visitor schedules a showing: saved, emailed, confirmation is not a booking
- ✅ `02-showing.spec.ts` (desktop) — server-side validation rejects bad input with clear messages
- ✅ `02-showing.spec.ts` (desktop) — submissions faster than a human are rejected (anti-spam)
- ✅ `02-showing.spec.ts` (desktop) — a failed email is recorded, the request is kept, and staff can retry it
- ✅ `02-showing.spec.ts` (desktop) — staff see the request in the admin with its email status
- ✅ `03-security.spec.ts` (desktop) — signed-out visitors cannot reach any admin page, API or enquiry
- ✅ `03-security.spec.ts` (desktop) — a forged session cookie is rejected
- ✅ `03-security.spec.ts` (desktop) — wrong passwords are rejected without revealing which part was wrong
- ✅ `03-security.spec.ts` (desktop) — editors manage listings but cannot see customer enquiries or settings
- ✅ `03-security.spec.ts` (desktop) — agents see enquiries but cannot import listings or change settings
- ✅ `03-security.spec.ts` (desktop) — signing out ends the session
- ✅ `03-security.spec.ts` (desktop) — cron endpoints require the secret
- ✅ `03-security.spec.ts` (desktop) — security headers are sent; admin pages are not indexed or cached
- ✅ `04-public.spec.ts` (desktop) — home page: hero search, featured, locations, recent listings and seller section
- ✅ `04-public.spec.ts` (desktop) — search filters, sorting, pagination and clear-filters work against the database
- ✅ `04-public.spec.ts` (desktop) — archived and draft listings are never shown; sold listings say they are unavailable
- ✅ `04-public.spec.ts` (desktop) — property pages show gallery, details, disclosures and a demo label
- ✅ `04-public.spec.ts` (desktop) — legal pages are drafts with unmistakable placeholders
- ✅ `04-public.spec.ts` (desktop) — valuation calculator never fabricates data
- ✅ `04-public.spec.ts` (desktop) — valuation uses asking prices of real listings, clearly labelled
- ✅ `04-public.spec.ts` (desktop) — sell form submits, saves and emails the business
- ✅ `04-public.spec.ts` (desktop) — contact form submits
- ✅ `04-public.spec.ts` (desktop) — turning demo mode off hides every demo listing and the banner
- ✅ `04-public.spec.ts` (desktop) — compliance checklist flags missing legal information before launch
- ✅ `05-links.spec.ts` (desktop) — all internal links and images on public pages work
- ✅ `05-links.spec.ts` (desktop) — sitemap lists real listings only (no demo, no admin)
- ✅ `06-accessibility.spec.ts` (desktop) — no serious accessibility violations on /
- ✅ `06-accessibility.spec.ts` (desktop) — no serious accessibility violations on /buy
- ✅ `06-accessibility.spec.ts` (desktop) — no serious accessibility violations on /rent?beds=2
- ✅ `06-accessibility.spec.ts` (desktop) — no serious accessibility violations on /property/demo-102
- ✅ `06-accessibility.spec.ts` (desktop) — no serious accessibility violations on /sell
- ✅ `06-accessibility.spec.ts` (desktop) — no serious accessibility violations on /valuation
- ✅ `06-accessibility.spec.ts` (desktop) — no serious accessibility violations on /contact
- ✅ `06-accessibility.spec.ts` (desktop) — no serious accessibility violations on /about
- ✅ `06-accessibility.spec.ts` (desktop) — no serious accessibility violations on /disclosures
- ✅ `06-accessibility.spec.ts` (desktop) — no serious accessibility violations on /admin/login
- ✅ `07-admin-forms.spec.ts` (desktop) — business settings appear on the public site and replace placeholders
- ✅ `07-admin-forms.spec.ts` (desktop) — listing editor saves changes and old links redirect to the new address
- ✅ `07-admin-forms.spec.ts` (desktop) — quick status and featured buttons in the listings table work
- ✅ `07-admin-forms.spec.ts` (desktop) — a single listing can be added from the admin
- ✅ `07-admin-forms.spec.ts` (desktop) — verified comparables switch the calculator to an indicative estimate
- ✅ `07-admin-forms.spec.ts` (desktop) — legal page editor publishes changes and the review flag removes the draft banner
- ✅ `07-admin-forms.spec.ts` (desktop) — new staff accounts get a temporary password and must change it
- ✅ `mobile.spec.ts` (mobile) — no horizontal overflow on /
- ✅ `mobile.spec.ts` (mobile) — no horizontal overflow on /buy
- ✅ `mobile.spec.ts` (mobile) — no horizontal overflow on /rent
- ✅ `mobile.spec.ts` (mobile) — no horizontal overflow on /commercial
- ✅ `mobile.spec.ts` (mobile) — no horizontal overflow on /property/demo-101
- ✅ `mobile.spec.ts` (mobile) — no horizontal overflow on /sell
- ✅ `mobile.spec.ts` (mobile) — no horizontal overflow on /valuation
- ✅ `mobile.spec.ts` (mobile) — no horizontal overflow on /about
- ✅ `mobile.spec.ts` (mobile) — no horizontal overflow on /contact
- ✅ `mobile.spec.ts` (mobile) — no horizontal overflow on /privacy
- ✅ `mobile.spec.ts` (mobile) — no horizontal overflow on /disclosures
- ✅ `mobile.spec.ts` (mobile) — no horizontal overflow on /admin/login
- ✅ `mobile.spec.ts` (mobile) — mobile menu opens and navigates
- ✅ `mobile.spec.ts` (mobile) — filters collapse behind a button on phones
- ✅ `mobile.spec.ts` (mobile) — sticky 'Schedule a showing' button jumps to the form

