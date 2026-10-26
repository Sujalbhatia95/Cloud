import { z } from "zod";

/**
 * Editable business / compliance settings (Admin → Settings). Stored as one JSON document.
 * Empty strings mean "not provided yet" and are rendered as unmistakable placeholders.
 */
export const settingsSchema = z.object({
  demoMode: z.boolean().default(true),
  business: z
    .object({
      name: z.string().default("Shree Krishna Associate"),
      legalName: z.string().default(""),
      entityType: z.string().default(""),
      email: z.string().default("associateshreekrishna775@gmail.com"),
      phone: z.string().default(""),
      whatsapp: z.string().default(""),
      addressLine: z.string().default(""),
      city: z.string().default(""),
      state: z.string().default(""),
      pincode: z.string().default(""),
      officeHours: z.string().default(""),
      gstin: z.string().default(""),
    })
    .prefault({}),
  /** The State / UT whose RERA authority and rules apply to the business's operations. */
  operatingState: z.string().default(""),
  rera: z
    .object({
      agentStatus: z.enum(["unset", "registered", "not_required"]).default("unset"),
      agentRegistrationNumber: z.string().default(""),
      authorityName: z.string().default(""),
      authorityWebsite: z.string().default(""),
      validUntil: z.string().default(""),
      notRequiredReason: z.string().default(""),
    })
    .prefault({}),
  brokerage: z
    .object({
      sale: z.string().default(""),
      rent: z.string().default(""),
      commercial: z.string().default(""),
      notes: z.string().default(""),
    })
    .prefault({}),
  privacy: z
    .object({
      grievanceOfficerName: z.string().default(""),
      grievanceOfficerEmail: z.string().default(""),
      grievanceOfficerPhone: z.string().default(""),
      retentionDays: z.number().int().min(30).max(3650).default(730),
    })
    .prefault({}),
});

export type SiteSettings = z.infer<typeof settingsSchema>;

export function parseSettings(data: unknown): SiteSettings {
  const r = settingsSchema.safeParse(data ?? {});
  return r.success ? r.data : settingsSchema.parse({});
}

/* ----------------------------- Placeholders ----------------------------- */

export const RERA_PLACEHOLDER = "[DEMO ONLY — INSERT VERIFIED RERA DETAILS IF APPLICABLE]";
export const placeholder = (what: string) => `[DEMO ONLY — INSERT VERIFIED ${what.toUpperCase()}]`;
export const isPlaceholder = (s: string) => s.startsWith("[DEMO ONLY");

export function orPlaceholder(value: string | null | undefined, what: string): string {
  return value && value.trim() ? value.trim() : placeholder(what);
}

export function formatAddress(s: SiteSettings): string {
  const b = s.business;
  const parts = [b.addressLine, b.city, b.state, b.pincode].map((x) => x.trim()).filter(Boolean);
  return parts.length >= 2 && b.addressLine.trim() ? parts.join(", ") : placeholder("office address");
}

/** Human-readable RERA agent line for footers / disclosures. */
export function reraAgentLine(s: SiteSettings): string {
  const r = s.rera;
  if (r.agentStatus === "registered" && r.agentRegistrationNumber.trim()) {
    const auth = r.authorityName.trim() || placeholder("RERA authority name");
    return `RERA Agent Registration No. ${r.agentRegistrationNumber.trim()} (${auth})`;
  }
  if (r.agentStatus === "not_required") return "RERA agent registration: not applicable to the services offered (see Disclosures)";
  return `RERA Agent Registration: ${RERA_PLACEHOLDER}`;
}
