# Production launch checklist

Work through this list before telling customers about the website. Admin → **Compliance checklist** checks many of
these automatically and must show **no blockers**.

## A. Hosting & configuration

- [ ] PostgreSQL database created (e.g. Neon via Vercel → Storage, or Supabase); migrations applied (automatic on Vercel deploys, otherwise `pnpm db:setup`).
- [ ] Database backups enabled and a restore tested once.
- [ ] All environment variables set in the host (see `.env.example`); `SITE_URL` is the final `https://` domain.
- [ ] `SESSION_SECRET` and `CRON_SECRET` are long random values, different from any test values.
- [ ] Custom domain connected; HTTPS working; `www` and bare domain both resolve.
- [ ] `/api/health` returns `{"ok":true}`; an uptime monitor checks it.
- [ ] Scheduled jobs running (`/api/cron/email-retry`, `/api/cron/maintenance`) — check Admin → Email delivery after a day.

## B. Email

- [ ] Sending domain verified with Resend (or SendGrid); `EMAIL_FROM` uses that domain.
- [ ] `NOTIFY_EMAIL` is correct (default associateshreekrishna775@gmail.com).
- [ ] Admin → Email delivery → **Send test email** arrives in the inbox (not spam).
- [ ] A real test showing request, seller enquiry and contact message each arrive with all details.

## C. Accounts & security

- [ ] Your own admin account created; temporary password changed.
- [ ] Staff accounts use the least-privileged role (editor / agent); no shared accounts.
- [ ] Optional: Cloudflare Turnstile keys added for extra bot protection.

## D. Business & legal information (Admin → Business settings)

- [ ] Registered legal name and entity type.
- [ ] Office address, phone/WhatsApp, office hours.
- [ ] GSTIN (if registered).
- [ ] State/UT of operation.
- [ ] RERA agent registration number, authority name, official website and validity — **or** "not required" with the
      written legal reason.
- [ ] Brokerage/commission terms for sales, rentals and commercial.
- [ ] Grievance Officer name and email; retention period confirmed.
- [ ] No **[DEMO ONLY — …]** placeholders remain anywhere on the site (search each page).

## E. Legal review (Admin → Legal & page content)

- [ ] Privacy Notice reviewed by a qualified lawyer and marked reviewed.
- [ ] Terms of Use reviewed and marked reviewed.
- [ ] Disclosures reviewed and marked reviewed.
- [ ] About page facts (team, history) are accurate.
- [ ] Manual items on the Compliance checklist confirmed with notes (RERA applicability, owner authorisations,
      image rights, processor terms, breach plan…).

## F. Listings

- [ ] Real listings imported from your spreadsheet; preview checked; no unexpected rejections.
- [ ] Every RERA project number verified on the State RERA website.
- [ ] Photos are your own or licensed.
- [ ] Prices, areas (with area type) and availability double-checked for featured listings.
- [ ] Optional: verified comparable sales entered under Admin → Valuation data.

## G. Switch off demo content

- [ ] Admin → Business settings → **Turn demo mode off**.
- [ ] Optionally **Delete all demo listings**.
- [ ] The home-page photos (`public/demo/hero.jpg`, `closing.jpg`) are Pexels stock photos (see `docs/IMAGE_CREDITS.md`). Replace them with your own photographs if you prefer, then run `python3 scripts/make_og.py`.

## H. Final checks

- [ ] Visit every page on a phone and a computer; submit each form once.
- [ ] Search for a city, a PIN code and a listing ID; try price and bedroom filters.
- [ ] Open a sold listing link — it says "no longer available".
- [ ] Submit the sitemap (`https://your-domain/sitemap.xml`) in Google Search Console.
