/**
 * Server-side validation for public forms. The browser also validates, but these rules are
 * authoritative. Only the fields needed to respond are collected (data minimisation).
 */
import { z } from "zod";
import { AREA_TYPES, AREA_UNITS, PROPERTY_TYPES } from "@/lib/listings/constants";
import { parseInr } from "@/lib/listings/normalize";

export const CONSENT_VERSION = "2026-10-v1";

export const SHOWING_TIMES = {
  morning: "Morning (9 am – 12 pm)",
  afternoon: "Afternoon (12 pm – 4 pm)",
  evening: "Evening (4 pm – 7 pm)",
} as const;

export const FLEXIBILITY = {
  exact: "Only the date and time I selected",
  flexible_time: "Same day, any time",
  flexible_day: "A day or two either side",
  any: "Any time in the next two weeks",
} as const;

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ message: `${label} is required` })
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(min, `${label} is required`).max(max, `${label} must be at most ${max} characters`));

const optionalText = (max: number, label: string) =>
  z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim())
    .pipe(z.string().max(max, `${label} must be at most ${max} characters`))
    .transform((s) => (s === "" ? null : s));

export const nameField = trimmed(2, 100, "Name").refine((s) => /\p{L}/u.test(s), "Please enter your name");
export const emailField = z
  .string({ message: "Email is required" })
  .trim()
  .toLowerCase()
  .max(200)
  .pipe(z.email("Enter a valid email address"));

/** Indian mobile numbers (+91 / 0 prefix optional) or international numbers with country code. */
export const phoneField = z
  .string({ message: "Phone number is required" })
  .transform((s) => s.replace(/[\s\-().]/g, ""))
  .refine((s) => /^(?:(?:\+91|91|0)?[6-9]\d{9}|\+(?!91)[1-9]\d{7,14})$/.test(s), "Enter a valid 10-digit mobile number (or include the country code)")
  .transform((s) => {
    const m = s.match(/^(?:\+91|91|0)?([6-9]\d{9})$/);
    return m ? `+91 ${m[1].slice(0, 5)} ${m[1].slice(5)}` : s;
  });

const consentField = z.literal("on", { message: "Please confirm you agree to be contacted about this enquiry" });
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on");

function istToday(now: Date): string {
  return new Date(now.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

export function showingSchema(now: Date = new Date()) {
  const today = istToday(now);
  const max = istToday(new Date(now.getTime() + 120 * 86400 * 1000));
  return z.object({
    listingId: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9_.-]{0,63}$/, "Invalid property reference"),
    name: nameField,
    email: emailField,
    phone: phoneField,
    preferredDate: z
      .string({ message: "Choose a preferred date" })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a preferred date")
      .refine((d) => d >= today, "The preferred date cannot be in the past")
      .refine((d) => d <= max, "Please choose a date within the next four months"),
    preferredTime: z.enum(Object.keys(SHOWING_TIMES) as [keyof typeof SHOWING_TIMES], { message: "Choose a preferred time" }),
    flexibility: z.enum(Object.keys(FLEXIBILITY) as [keyof typeof FLEXIBILITY], { message: "Tell us how flexible you are" }),
    message: optionalText(1000, "Message"),
    consent: consentField,
    marketingConsent: checkbox,
  });
}
export type ShowingInput = z.infer<ReturnType<typeof showingSchema>>;

const inrOptional = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (!s || !s.trim()) return null;
    const r = parseInr(s, "Expected price");
    if (!r.ok) {
      ctx.addIssue({ code: "custom", message: r.error });
      return z.NEVER;
    }
    return r.value;
  });

const optionalNumber = (label: string, max: number) =>
  z
    .string()
    .optional()
    .transform((s, ctx) => {
      if (!s || !s.trim()) return null;
      const n = Number(s.replace(/,/g, ""));
      if (!Number.isFinite(n) || n <= 0 || n > max) {
        ctx.addIssue({ code: "custom", message: `${label} must be a positive number` });
        return z.NEVER;
      }
      return n;
    });

export const SELLER_ENQUIRY_TYPES = {
  sell: "Sell my property",
  rent_out: "Rent out / lease my property",
  valuation: "Request a professional valuation",
} as const;

export const sellerSchema = z.object({
  enquiryType: z.enum(Object.keys(SELLER_ENQUIRY_TYPES) as [keyof typeof SELLER_ENQUIRY_TYPES], { message: "Choose what you would like to do" }),
  ownerName: nameField,
  email: emailField,
  phone: phoneField,
  preferredContact: z.enum(["phone", "email", "whatsapp"]).optional().default("phone"),
  addressLine: optionalText(200, "Address"),
  locality: trimmed(2, 100, "Locality"),
  city: trimmed(2, 80, "City"),
  state: trimmed(2, 60, "State"),
  pincode: z
    .string()
    .optional()
    .transform((s) => (s ?? "").replace(/\s/g, ""))
    .refine((s) => s === "" || /^[1-9]\d{5}$/.test(s), "PIN code must be 6 digits")
    .transform((s) => (s === "" ? null : s)),
  propertyType: z.enum(Object.keys(PROPERTY_TYPES) as [keyof typeof PROPERTY_TYPES], { message: "Choose a property type" }),
  areaValue: optionalNumber("Area", 1e9),
  areaUnit: z.enum(Object.keys(AREA_UNITS) as [keyof typeof AREA_UNITS]).optional().default("sqft"),
  areaType: z
    .union([z.enum(Object.keys(AREA_TYPES) as [keyof typeof AREA_TYPES]), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  bedrooms: optionalNumber("Bedrooms", 30),
  expectedPrice: inrOptional,
  details: optionalText(2000, "Details"),
  consent: consentField,
  marketingConsent: checkbox,
});
export type SellerInput = z.infer<typeof sellerSchema>;

export const CONTACT_SUBJECTS = {
  buying: "Buying a property",
  renting: "Renting a property",
  selling: "Selling or letting my property",
  commercial: "Commercial property",
  other: "Something else",
} as const;

export const contactSchema = z.object({
  name: nameField,
  email: emailField,
  phone: z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim())
    .pipe(z.union([z.literal(""), phoneField]))
    .transform((s) => (s === "" ? null : s)),
  subject: z.enum(Object.keys(CONTACT_SUBJECTS) as [keyof typeof CONTACT_SUBJECTS], { message: "Choose a subject" }),
  message: trimmed(10, 2000, "Message"),
  consent: consentField,
  marketingConsent: checkbox,
});
export type ContactInput = z.infer<typeof contactSchema>;

export type FieldErrors = Record<string, string>;
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
