import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { env } from "@/lib/env";
import { getContentPage, renderTokens, unresolvedPlaceholders, LEGAL_SLUGS } from "@/lib/content/pages";
import { getSettings } from "@/lib/settings";

export type CheckLevel = "blocker" | "warning" | "ok";
export type AutoCheck = { key: string; group: string; title: string; level: CheckLevel; detail: string; href?: string };

/** Manual items an owner / lawyer must confirm before launch. */
export const MANUAL_ITEMS = [
  { key: "rera_applicability", title: "Confirmed with a lawyer whether RERA agent registration is required for our actual activities in each State/UT where we operate" },
  { key: "rera_projects_verified", title: "Every RERA project number on the website has been checked against the State RERA website" },
  { key: "legal_privacy", title: "Privacy Notice reviewed and approved by a qualified lawyer (DPDP Act 2023 and rules)" },
  { key: "legal_terms", title: "Terms of Use reviewed and approved by a qualified lawyer" },
  { key: "legal_disclosures", title: "Disclosures (brokerage, RERA, accuracy, pricing) reviewed and approved by a qualified lawyer" },
  { key: "brokerage_agreements", title: "Written brokerage / service agreement templates are in place for sellers, buyers, landlords and tenants" },
  { key: "owner_authorisation", title: "Written authorisation from the owner/developer is held for every listing advertised" },
  { key: "image_rights", title: "We own or are licensed to use every listing photograph (no images copied from other portals)" },
  { key: "homepage_claims", title: "Homepage and About page statements accurately describe how we work (no unverified claims)" },
  { key: "processor_terms", title: "Data processing terms accepted with hosting, database and email providers" },
  { key: "breach_plan", title: "A personal-data breach response plan exists (who to inform and how quickly)" },
  { key: "gst_registration", title: "GST registration status confirmed and GSTIN added if registered" },
] as const;

export async function runAutoChecks(): Promise<AutoCheck[]> {
  const s = await getSettings();
  const db = getDb();
  const checks: AutoCheck[] = [];
  const add = (c: AutoCheck) => checks.push(c);
  const req = (group: string, key: string, title: string, value: string, href = "/admin/settings") =>
    add({ key, group, title, level: value.trim() ? "ok" : "blocker", detail: value.trim() ? value : "Not provided — a placeholder is shown on the website.", href });

  // Business identity
  req("Business details", "legal_name", "Registered legal name", s.business.legalName);
  req("Business details", "entity_type", "Type of business entity", s.business.entityType);
  req("Business details", "address", "Office address", [s.business.addressLine, s.business.city, s.business.state].filter(Boolean).join(", "));
  req("Business details", "phone", "Business phone number", s.business.phone);
  add({
    key: "gstin",
    group: "Business details",
    title: "GSTIN (if registered for GST)",
    level: s.business.gstin ? "ok" : "warning",
    detail: s.business.gstin || "Not provided. Add it if you are registered for GST.",
    href: "/admin/settings",
  });

  // Jurisdiction & RERA
  req("RERA & jurisdiction", "operating_state", "State / UT of operation", s.operatingState);
  if (s.rera.agentStatus === "registered") {
    req("RERA & jurisdiction", "rera_number", "RERA agent registration number", s.rera.agentRegistrationNumber);
    req("RERA & jurisdiction", "rera_authority", "RERA authority name", s.rera.authorityName);
    req("RERA & jurisdiction", "rera_website", "RERA authority website", s.rera.authorityWebsite);
    const expired = s.rera.validUntil && s.rera.validUntil < new Date().toISOString().slice(0, 10);
    add({
      key: "rera_validity",
      group: "RERA & jurisdiction",
      title: "RERA agent registration valid",
      level: !s.rera.validUntil ? "warning" : expired ? "blocker" : "ok",
      detail: !s.rera.validUntil ? "Validity date not recorded." : expired ? `Expired on ${s.rera.validUntil}.` : `Valid until ${s.rera.validUntil}.`,
      href: "/admin/settings",
    });
  } else if (s.rera.agentStatus === "not_required") {
    add({
      key: "rera_not_required",
      group: "RERA & jurisdiction",
      title: "RERA agent registration marked as not required",
      level: s.rera.notRequiredReason.trim() ? "warning" : "blocker",
      detail: s.rera.notRequiredReason.trim()
        ? `Reason recorded: "${s.rera.notRequiredReason}". Keep written legal advice on file.`
        : "Record the reason (based on legal advice) in Settings.",
      href: "/admin/settings",
    });
  } else {
    add({
      key: "rera_status",
      group: "RERA & jurisdiction",
      title: "RERA agent registration status",
      level: "blocker",
      detail: "Not set. Enter your registration details, or record legal advice that registration is not required.",
      href: "/admin/settings",
    });
  }
  const [{ missingRera }] = await db
    .select({ missingRera: sql<number>`count(*)::int` })
    .from(schema.listings)
    .where(
      and(
        eq(schema.listings.isDemo, false),
        eq(schema.listings.transactionType, "sale"),
        eq(schema.listings.possessionStatus, "under_construction"),
        isNull(schema.listings.reraProjectNumber),
        sql`${schema.listings.listingStatus} in ('active','under_offer')`,
      ),
    );
  add({
    key: "listing_rera",
    group: "RERA & jurisdiction",
    title: "Under-construction sale listings have RERA project numbers",
    level: missingRera > 0 ? "blocker" : "ok",
    detail: missingRera > 0 ? `${missingRera} published listing(s) are missing a RERA project number.` : "No published under-construction sale listings are missing a number.",
    href: "/admin/listings?flag=rera",
  });

  // Brokerage & privacy
  req("Disclosures", "brokerage_sale", "Brokerage terms — sales", s.brokerage.sale);
  req("Disclosures", "brokerage_rent", "Brokerage terms — rentals", s.brokerage.rent);
  req("Privacy", "grievance_name", "Grievance Officer name", s.privacy.grievanceOfficerName);
  req("Privacy", "grievance_email", "Grievance Officer email", s.privacy.grievanceOfficerEmail);

  for (const slug of LEGAL_SLUGS) {
    const page = await getContentPage(slug);
    const left = unresolvedPlaceholders(renderTokens(page.bodyMd, s, page.updatedAt));
    add({
      key: `content_${slug}`,
      group: "Legal pages",
      title: `${page.title}: reviewed and complete`,
      level: !page.legalReviewed || left.length ? "blocker" : "ok",
      detail: !page.legalReviewed
        ? "Not yet marked as reviewed by a lawyer."
        : left.length
          ? `${left.length} placeholder(s) remain, e.g. ${left[0]}`
          : "Reviewed; no placeholders remain.",
      href: `/admin/content/${slug}`,
    });
  }

  // Demo mode
  const [{ demoCount }] = await db.select({ demoCount: sql<number>`count(*)::int` }).from(schema.listings).where(eq(schema.listings.isDemo, true));
  add({
    key: "demo_mode",
    group: "Launch",
    title: "Demo mode switched off",
    level: s.demoMode ? "blocker" : "ok",
    detail: s.demoMode ? "Demo listings and the demo banner are visible to the public." : "Demo content is hidden.",
    href: "/admin/settings#demo",
  });
  add({
    key: "demo_listings",
    group: "Launch",
    title: "Demo listings removed",
    level: demoCount > 0 ? "warning" : "ok",
    detail: demoCount > 0 ? `${demoCount} demo listing(s) remain in the database (hidden when demo mode is off).` : "None remain.",
    href: "/admin/settings#demo",
  });

  // Technical
  add({
    key: "site_url",
    group: "Technical",
    title: "SITE_URL is your https domain",
    level: env.siteUrl.startsWith("https://") && !/localhost|127\.0\.0\.1/.test(env.siteUrl) ? "ok" : "blocker",
    detail: env.siteUrl,
  });
  add({
    key: "session_secret",
    group: "Technical",
    title: "Strong SESSION_SECRET configured",
    level: env.sessionSecretIsStrong ? "ok" : "blocker",
    detail: env.sessionSecretIsStrong ? "Configured." : "Set SESSION_SECRET to 32+ random characters.",
  });
  const provider = env.emailProvider;
  add({
    key: "email_provider",
    group: "Technical",
    title: "Transactional email provider configured",
    level: provider === "resend" || provider === "sendgrid" ? "ok" : "blocker",
    detail: provider === "resend" || provider === "sendgrid" ? `${provider} → notifications to ${env.notifyEmail}` : `EMAIL_PROVIDER is "${provider}" — emails are not delivered.`,
    href: "/admin/emails",
  });
  const [lastTest] = await db
    .select({ id: schema.emailOutbox.id })
    .from(schema.emailOutbox)
    .where(and(eq(schema.emailOutbox.kind, "test"), eq(schema.emailOutbox.status, "sent"), sql`${schema.emailOutbox.provider} in ('resend','sendgrid')`))
    .limit(1);
  add({
    key: "email_test",
    group: "Technical",
    title: "Test email delivered through the provider",
    level: lastTest ? "ok" : "warning",
    detail: lastTest ? "A test email was accepted by the provider. Check it arrived in the inbox." : "Send a test email from Admin → Emails.",
    href: "/admin/emails",
  });
  const [{ failed }] = await db.select({ failed: sql<number>`count(*)::int` }).from(schema.emailOutbox).where(eq(schema.emailOutbox.status, "failed"));
  add({
    key: "email_failures",
    group: "Technical",
    title: "No undelivered notification emails",
    level: failed > 0 ? "warning" : "ok",
    detail: failed > 0 ? `${failed} email(s) failed — retry them from Admin → Emails.` : "All delivered.",
    href: "/admin/emails",
  });
  add({
    key: "cron",
    group: "Technical",
    title: "CRON_SECRET set (automatic email retries & data retention)",
    level: env.cronSecret ? "ok" : "warning",
    detail: env.cronSecret ? "Configured." : "Set CRON_SECRET and schedule the cron endpoints (see README).",
  });
  add({
    key: "turnstile",
    group: "Technical",
    title: "Bot protection (Cloudflare Turnstile) on public forms",
    level: env.turnstileSecretKey && env.turnstileSiteKey ? "ok" : "warning",
    detail: env.turnstileSecretKey ? "Enabled." : "Optional but recommended. Honeypot, timing and rate limits are already active.",
  });
  const [{ mustChange }] = await db
    .select({ mustChange: sql<number>`count(*)::int` })
    .from(schema.adminUsers)
    .where(and(eq(schema.adminUsers.isActive, true), eq(schema.adminUsers.mustChangePassword, true)));
  add({
    key: "temp_passwords",
    group: "Technical",
    title: "No active accounts still using a temporary password",
    level: mustChange > 0 ? "warning" : "ok",
    detail: mustChange > 0 ? `${mustChange} account(s) have not changed their temporary password.` : "All set.",
    href: "/admin/users",
  });
  return checks;
}

export async function getManualItems() {
  const rows = await getDb().select().from(schema.complianceItems);
  const map = new Map(rows.map((r) => [r.key, r]));
  return MANUAL_ITEMS.map((m) => ({ ...m, done: map.get(m.key)?.done ?? false, note: map.get(m.key)?.note ?? "", updatedBy: map.get(m.key)?.updatedBy ?? null, updatedAt: map.get(m.key)?.updatedAt ?? null }));
}
