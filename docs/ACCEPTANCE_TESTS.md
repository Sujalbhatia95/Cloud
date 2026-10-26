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
| 9 | All forms, buttons, links and mobile layouts work | e2e: showing, seller and contact forms; valuation calculator; hero search; filters; link and image crawl of all public pages; sitemap; mobile (Pixel 7): no horizontal overflow on 12 pages, menu, filter drawer, sticky showing button; automated accessibility checks (axe-core, WCAG 2.1 AA, serious/critical) |

**Important:** the email tests use a local mock of the Resend API. They prove the website sends each notification
to the provider with the correct recipient and content, and handles failures — they cannot prove delivery into the
Gmail inbox. After adding your real API key, use **Admin → Email delivery → Send test email**.

## Latest results

_Filled in from the final run — see below._
