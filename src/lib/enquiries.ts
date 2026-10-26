import "server-only";
import { getDb, schema } from "@/db";
import { env } from "@/lib/env";
import { contactEmail, sellerEnquiryEmail, showingRequestEmail } from "@/lib/email/templates";
import { queueAndSend } from "@/lib/email/outbox";
import {
  CONSENT_VERSION,
  CONTACT_SUBJECTS,
  FLEXIBILITY,
  SELLER_ENQUIRY_TYPES,
  SHOWING_TIMES,
  contactSchema,
  fieldErrors,
  sellerSchema,
  showingSchema,
  type FieldErrors,
} from "@/lib/forms/schemas";
import { rateLimit } from "@/lib/forms/rate-limit";
import { checkSpam } from "@/lib/forms/spam";
import { AREA_UNITS, type AreaUnit } from "@/lib/listings/constants";
import { formatInrFull, propertyTypeLabel } from "@/lib/listings/format";
import { getPublicListing } from "@/lib/listings/queries";
import { listingPath } from "@/lib/listings/slug";
import { getSettings } from "@/lib/settings";
import { hashIp, reference } from "@/lib/security/crypto";
import type { RequestMeta } from "@/lib/security/request";

export type FormState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: FieldErrors; values?: Record<string, string> }
  | { status: "success"; reference: string; message: string };

function formValues(data: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of data.entries()) if (typeof v === "string" && !k.startsWith("$") && k !== "form_token") out[k] = v.slice(0, 2000);
  return out;
}

async function guard(form: string, data: FormData, meta: RequestMeta, limit: number): Promise<FormState | "silent" | null> {
  const spam = await checkSpam(form, data, meta.ip);
  if (!spam.ok) {
    if (spam.silent) return "silent";
    return { status: "error", message: spam.message, values: formValues(data) };
  }
  const rl = await rateLimit(`form:${form}:${hashIp(meta.ip) ?? "unknown"}`, limit, 3600);
  if (!rl.ok)
    return {
      status: "error",
      message: `Too many submissions from your connection. Please try again in about ${Math.ceil(rl.retryAfter / 60)} minutes, or email us directly.`,
      values: formValues(data),
    };
  return null;
}

const SILENT_OK: FormState = { status: "success", reference: "—", message: "Thank you. Your request has been received." };

export async function submitShowingRequest(data: FormData, meta: RequestMeta, now = new Date()): Promise<FormState> {
  const g = await guard("showing", data, meta, 8);
  if (g === "silent") return SILENT_OK;
  if (g) return g;

  const parsed = showingSchema(now).safeParse(Object.fromEntries(data));
  if (!parsed.success)
    return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: formValues(data) };
  const input = parsed.data;

  const settings = await getSettings();
  const listing = await getPublicListing(input.listingId, settings.demoMode);
  if (!listing || (listing.listingStatus !== "active" && listing.listingStatus !== "under_offer"))
    return { status: "error", message: "This property is no longer available for viewings.", values: formValues(data) };

  const ref = reference("SR");
  const propertyUrl = `${env.siteUrl}${listingPath(listing)}`;
  const [row] = await getDb()
    .insert(schema.showingRequests)
    .values({
      reference: ref,
      listingUuid: listing.id,
      listingId: listing.listingId,
      propertyTitle: listing.title,
      propertyUrl,
      name: input.name,
      email: input.email,
      phone: input.phone,
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime,
      flexibility: input.flexibility,
      message: input.message,
      consentAt: now,
      consentVersion: CONSENT_VERSION,
      marketingConsent: input.marketingConsent,
      ipHash: hashIp(meta.ip),
    })
    .returning({ id: schema.showingRequests.id, createdAt: schema.showingRequests.createdAt });

  const mail = showingRequestEmail({
    reference: ref,
    name: input.name,
    email: input.email,
    phone: input.phone,
    propertyTitle: listing.title,
    propertyUrl,
    listingId: listing.listingId,
    preferredDate: input.preferredDate,
    preferredTimeLabel: SHOWING_TIMES[input.preferredTime],
    flexibilityLabel: FLEXIBILITY[input.flexibility],
    message: input.message,
    submittedAt: row.createdAt,
    adminUrl: `${env.siteUrl}/admin/enquiries/showing/${row.id}`,
    isDemo: listing.isDemo,
  });
  // Email failures never lose the request: it is saved above and the outbox retries delivery.
  await queueAndSend("showing_request", row.id, { to: env.notifyEmail, replyTo: input.email, ...mail });

  return {
    status: "success",
    reference: ref,
    message:
      "Thank you — your request has been received. This is not a confirmed appointment: our team will contact you to confirm a time that works.",
  };
}

export async function submitSellerEnquiry(data: FormData, meta: RequestMeta, valuationSnapshot?: unknown): Promise<FormState> {
  const g = await guard("seller", data, meta, 6);
  if (g === "silent") return SILENT_OK;
  if (g) return g;
  const parsed = sellerSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success)
    return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: formValues(data) };
  const input = parsed.data;
  const now = new Date();
  const ref = reference("SE");
  const [row] = await getDb()
    .insert(schema.sellerEnquiries)
    .values({
      reference: ref,
      enquiryType: input.enquiryType,
      ownerName: input.ownerName,
      email: input.email,
      phone: input.phone,
      preferredContact: input.preferredContact,
      addressLine: input.addressLine,
      locality: input.locality,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      propertyType: input.propertyType,
      areaValue: input.areaValue,
      areaUnit: input.areaValue ? input.areaUnit : null,
      areaType: input.areaType,
      bedrooms: input.bedrooms,
      expectedPrice: input.expectedPrice,
      details: input.details,
      valuationSnapshot: valuationSnapshot ?? null,
      consentAt: now,
      consentVersion: CONSENT_VERSION,
      marketingConsent: input.marketingConsent,
      ipHash: hashIp(meta.ip),
    })
    .returning({ id: schema.sellerEnquiries.id, createdAt: schema.sellerEnquiries.createdAt });

  const snap = valuationSnapshot as { low?: number; high?: number; basis?: string } | undefined;
  const mail = sellerEnquiryEmail({
    reference: ref,
    typeLabel: SELLER_ENQUIRY_TYPES[input.enquiryType],
    ownerName: input.ownerName,
    email: input.email,
    phone: input.phone,
    preferredContact: input.preferredContact,
    location: [input.addressLine, input.locality, input.city, input.state, input.pincode].filter(Boolean).join(", "),
    propertyTypeLabel: propertyTypeLabel(input.propertyType),
    area: input.areaValue ? `${input.areaValue} ${AREA_UNITS[input.areaUnit as AreaUnit].label}${input.areaType ? ` (${input.areaType.replace(/_/g, " ")})` : ""}` : null,
    bedrooms: input.bedrooms,
    expectedPrice: input.expectedPrice ? formatInrFull(input.expectedPrice) : null,
    details: input.details,
    valuationNote: snap?.low && snap?.high ? `${formatInrFull(snap.low)} – ${formatInrFull(snap.high)} (${snap.basis ?? "illustrative"})` : null,
    submittedAt: row.createdAt,
    adminUrl: `${env.siteUrl}/admin/enquiries/seller/${row.id}`,
  });
  await queueAndSend("seller_enquiry", row.id, { to: env.notifyEmail, replyTo: input.email, ...mail });
  return {
    status: "success",
    reference: ref,
    message: "Thank you — we have received your details. A member of our team will contact you shortly.",
  };
}

export async function submitContactMessage(data: FormData, meta: RequestMeta): Promise<FormState> {
  const g = await guard("contact", data, meta, 6);
  if (g === "silent") return SILENT_OK;
  if (g) return g;
  const parsed = contactSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success)
    return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: formValues(data) };
  const input = parsed.data;
  const ref = reference("CM");
  const [row] = await getDb()
    .insert(schema.contactMessages)
    .values({
      reference: ref,
      name: input.name,
      email: input.email,
      phone: input.phone,
      subject: input.subject,
      message: input.message,
      consentAt: new Date(),
      consentVersion: CONSENT_VERSION,
      marketingConsent: input.marketingConsent,
      ipHash: hashIp(meta.ip),
    })
    .returning({ id: schema.contactMessages.id, createdAt: schema.contactMessages.createdAt });
  const mail = contactEmail({
    reference: ref,
    name: input.name,
    email: input.email,
    phone: input.phone,
    subjectLabel: CONTACT_SUBJECTS[input.subject],
    message: input.message,
    submittedAt: row.createdAt,
    adminUrl: `${env.siteUrl}/admin/enquiries/contact/${row.id}`,
  });
  await queueAndSend("contact_message", row.id, { to: env.notifyEmail, replyTo: input.email, ...mail });
  return { status: "success", reference: ref, message: "Thank you — your message has been received. We will reply soon." };
}
