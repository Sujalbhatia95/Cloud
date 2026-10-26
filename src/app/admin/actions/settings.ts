"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { audit, requireAction } from "@/lib/auth/guards";
import { DEFAULT_PAGES, type PageSlug } from "@/lib/content/defaults";
import { MANUAL_ITEMS } from "@/lib/compliance";
import { getSettings, saveSettings } from "@/lib/settings";
import { settingsSchema } from "@/lib/settings-schema";

const str = (d: FormData, k: string, max = 500) => String(d.get(k) ?? "").trim().slice(0, max);

export async function saveSettingsAction(data: FormData) {
  const user = await requireAction("settings");
  const current = await getSettings();
  const website = str(data, "rera.authorityWebsite", 200);
  if (website && !/^https:\/\/[^\s]+$/.test(website)) redirect(`/admin/settings?error=${encodeURIComponent("RERA authority website must start with https://")}`);
  const email = str(data, "business.email", 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(`/admin/settings?error=${encodeURIComponent("Business email is not valid.")}`);
  const retention = Number(str(data, "privacy.retentionDays", 6));
  const next = settingsSchema.safeParse({
    ...current,
    business: {
      name: str(data, "business.name", 120) || "Shree Krishna Associate",
      legalName: str(data, "business.legalName", 200),
      entityType: str(data, "business.entityType", 120),
      email: email || current.business.email,
      phone: str(data, "business.phone", 40),
      whatsapp: str(data, "business.whatsapp", 40),
      addressLine: str(data, "business.addressLine", 300),
      city: str(data, "business.city", 80),
      state: str(data, "business.state", 80),
      pincode: str(data, "business.pincode", 6),
      officeHours: str(data, "business.officeHours", 200),
      gstin: str(data, "business.gstin", 15).toUpperCase(),
    },
    operatingState: str(data, "operatingState", 80),
    rera: {
      agentStatus: str(data, "rera.agentStatus", 20) || "unset",
      agentRegistrationNumber: str(data, "rera.agentRegistrationNumber", 120),
      authorityName: str(data, "rera.authorityName", 200),
      authorityWebsite: website,
      validUntil: str(data, "rera.validUntil", 10),
      notRequiredReason: str(data, "rera.notRequiredReason", 1000),
    },
    brokerage: {
      sale: str(data, "brokerage.sale", 1000),
      rent: str(data, "brokerage.rent", 1000),
      commercial: str(data, "brokerage.commercial", 1000),
      notes: str(data, "brokerage.notes", 2000),
    },
    privacy: {
      grievanceOfficerName: str(data, "privacy.grievanceOfficerName", 120),
      grievanceOfficerEmail: str(data, "privacy.grievanceOfficerEmail", 200),
      grievanceOfficerPhone: str(data, "privacy.grievanceOfficerPhone", 40),
      retentionDays: Number.isFinite(retention) ? Math.min(3650, Math.max(30, Math.round(retention))) : current.privacy.retentionDays,
    },
  });
  if (!next.success) redirect(`/admin/settings?error=${encodeURIComponent("Some values were invalid: " + next.error.issues.map((i) => i.path.join(".")).join(", "))}`);
  if (next.data.business.gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(next.data.business.gstin))
    redirect(`/admin/settings?error=${encodeURIComponent("GSTIN must be 15 characters (e.g. 27ABCDE1234F1Z5).")}`);
  await saveSettings(next.data, user.email);
  await audit(user, "settings.updated", "site_settings", "1");
  revalidatePath("/", "layout");
  redirect(`/admin/settings?notice=${encodeURIComponent("Settings saved.")}`);
}

export async function setDemoModeAction(data: FormData) {
  const user = await requireAction("settings");
  const on = data.get("demoMode") === "on";
  const current = await getSettings();
  await saveSettings({ ...current, demoMode: on }, user.email);
  await audit(user, on ? "demo_mode.enabled" : "demo_mode.disabled", "site_settings", "1");
  revalidatePath("/", "layout");
  redirect(`/admin/settings?notice=${encodeURIComponent(on ? "Demo mode is ON — demo listings are visible." : "Demo mode is OFF — demo listings and the demo banner are hidden from the public.")}#demo`);
}

export async function deleteDemoListingsAction() {
  const user = await requireAction("settings");
  const deleted = await getDb().delete(schema.listings).where(eq(schema.listings.isDemo, true)).returning({ id: schema.listings.id });
  await audit(user, "demo_listings.deleted", "listing", undefined, { count: deleted.length });
  revalidatePath("/", "layout");
  redirect(`/admin/settings?notice=${encodeURIComponent(`Deleted ${deleted.length} demo listing(s).`)}#demo`);
}

function slugOf(v: unknown): PageSlug {
  const s = String(v);
  if (s === "privacy" || s === "terms" || s === "disclosures" || s === "about") return s;
  throw new Error("Unknown page");
}

export async function saveContentAction(data: FormData) {
  const user = await requireAction("content");
  const slug = slugOf(data.get("slug"));
  const title = str(data, "title", 120) || DEFAULT_PAGES[slug].title;
  const body = String(data.get("bodyMd") ?? "").slice(0, 60_000);
  const reviewed = data.get("legalReviewed") === "on";
  const reviewNote = str(data, "reviewNote", 500);
  if (body.trim().length < 20) redirect(`/admin/content/${slug}?error=${encodeURIComponent("The page text is too short.")}`);
  await getDb()
    .insert(schema.contentPages)
    .values({ slug, title, bodyMd: body, legalReviewed: reviewed, reviewNote, updatedBy: user.email, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.contentPages.slug,
      set: { title, bodyMd: body, legalReviewed: reviewed, reviewNote, updatedBy: user.email, updatedAt: new Date() },
    });
  await audit(user, "content.updated", "content_page", slug, { reviewed });
  revalidatePath("/", "layout");
  redirect(`/admin/content/${slug}?notice=${encodeURIComponent("Page saved and published.")}`);
}

export async function resetContentAction(data: FormData) {
  const user = await requireAction("content");
  const slug = slugOf(data.get("slug"));
  await getDb().delete(schema.contentPages).where(eq(schema.contentPages.slug, slug));
  await audit(user, "content.reset", "content_page", slug);
  revalidatePath("/", "layout");
  redirect(`/admin/content/${slug}?notice=${encodeURIComponent("Restored the default draft text.")}`);
}

export async function saveComplianceItemAction(data: FormData) {
  const user = await requireAction("compliance");
  const key = String(data.get("key") ?? "");
  if (!MANUAL_ITEMS.some((m) => m.key === key)) redirect("/admin/compliance?error=Unknown+item");
  const done = data.get("done") === "on";
  const note = str(data, "note", 500);
  await getDb()
    .insert(schema.complianceItems)
    .values({ key, done, note, updatedBy: user.email, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.complianceItems.key, set: { done, note, updatedBy: user.email, updatedAt: new Date() } });
  await audit(user, "compliance.item_updated", "compliance_item", key, { done });
  redirect(`/admin/compliance?notice=Saved#manual`);
}
