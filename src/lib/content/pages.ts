import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { atRequestTime } from "@/lib/request-time";
import { formatDateIST } from "@/lib/listings/format";
import { formatAddress, placeholder, reraAgentLine, type SiteSettings } from "@/lib/settings-schema";
import { CONTENT_TOKENS, DEFAULT_PAGES, type PageSlug } from "./defaults";

export type ContentPage = { slug: PageSlug; title: string; bodyMd: string; legalReviewed: boolean; updatedAt: Date | null; isDefault: boolean };

export const LEGAL_SLUGS: PageSlug[] = ["privacy", "terms", "disclosures"];

export async function getContentPage(slug: PageSlug): Promise<ContentPage> {
  await atRequestTime();
  const [row] = await getDb().select().from(schema.contentPages).where(eq(schema.contentPages.slug, slug)).limit(1);
  if (row) return { slug, title: row.title, bodyMd: row.bodyMd, legalReviewed: row.legalReviewed, updatedAt: row.updatedAt, isDefault: false };
  return { slug, title: DEFAULT_PAGES[slug].title, bodyMd: DEFAULT_PAGES[slug].body, legalReviewed: false, updatedAt: null, isDefault: true };
}

/** Replaces {{tokens}} with settings values, or with an unmistakable placeholder when not provided. */
export function renderTokens(md: string, s: SiteSettings, updatedAt: Date | null): string {
  const values: Record<string, string> = {
    "business.name": s.business.name,
    "business.legalName": s.business.legalName,
    "business.entityType": s.business.entityType,
    "business.address": formatAddress(s).startsWith("[DEMO ONLY") ? "" : formatAddress(s),
    "business.email": s.business.email,
    "business.phone": s.business.phone,
    "business.gstin": s.business.gstin,
    operatingState: s.operatingState,
    "rera.agentLine": reraAgentLine(s),
    "rera.authorityName": s.rera.authorityName,
    "rera.authorityWebsite": s.rera.authorityWebsite,
    "brokerage.sale": s.brokerage.sale,
    "brokerage.rent": s.brokerage.rent,
    "brokerage.commercial": s.brokerage.commercial,
    "brokerage.notes": s.brokerage.notes,
    "privacy.grievanceOfficer": [s.privacy.grievanceOfficerName, s.privacy.grievanceOfficerEmail, s.privacy.grievanceOfficerPhone]
      .filter(Boolean)
      .join(" · "),
    "privacy.retentionDays": `${s.privacy.retentionDays} days`,
    jurisdictionCity: s.business.city,
    lastUpdated: updatedAt ? formatDateIST(updatedAt) : placeholder("date of legal review"),
  };
  return md.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const v = values[key];
    if (v && v.trim()) return v.trim();
    if (key === "brokerage.notes") return "";
    return placeholder(CONTENT_TOKENS[key] ?? key);
  });
}

/** Lists tokens that would currently render as placeholders (for the compliance checklist). */
export function unresolvedPlaceholders(rendered: string): string[] {
  return Array.from(new Set(rendered.match(/\[DEMO ONLY[^\]]*\]/g) ?? []));
}
