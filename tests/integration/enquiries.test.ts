/**
 * Acceptance test 6: showing requests are validated server-side, saved, and emailed to
 * associateshreekrishna775@gmail.com through the transactional provider; failures are recorded
 * and can be retried. Also covers spam protection and seller / contact enquiries.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { deliver, processDueEmails } from "@/lib/email/outbox";
import { submitContactMessage, submitSellerEnquiry, submitShowingRequest } from "@/lib/enquiries";
import { issueFormToken } from "@/lib/forms/spam";
import { contentHash, validateListingRow } from "@/lib/listings/validate";
import { db, resetDb } from "../support/db";
import { startMockEmailServer } from "../support/mock-email-server";

let mock: Awaited<ReturnType<typeof startMockEmailServer>>;
let ipCounter = 0;
const meta = () => ({ ip: `203.0.113.${++ipCounter % 250}`, userAgent: "vitest" });

function istDate(daysAhead: number) {
  return new Date(Date.now() + 330 * 60_000 + daysAhead * 86_400_000).toISOString().slice(0, 10);
}

function form(fields: Record<string, string>, opts: { tokenAgeMs?: number; form?: string } = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  fd.set("form_token", issueFormToken(opts.form ?? "showing", Date.now() - (opts.tokenAgeMs ?? 10_000)));
  fd.set("company_website", "");
  return fd;
}

const showing = (over: Record<string, string> = {}) => ({
  listingId: "SKA-501",
  name: "Asha Verma",
  email: "asha@example.com",
  phone: "98765 43210",
  preferredDate: istDate(3),
  preferredTime: "evening",
  flexibility: "flexible_day",
  message: "Is covered parking included?",
  consent: "on",
  ...over,
});

async function addListing(id: string, status = "Active") {
  const v = validateListingRow({
    listing_id: id, title: "Sunlit 3 BHK apartment", transaction_type: "Sale", property_type: "Apartment", listing_status: status,
    price: "1.1 Cr", locality: "Baner", city: "Pune", state: "Maharashtra", pincode: "411045",
  });
  await db().insert(schema.listings).values({ ...v.listing!, contentHash: contentHash(v.listing!), source: "import" });
}

beforeAll(async () => {
  mock = await startMockEmailServer();
  process.env.EMAIL_PROVIDER = "resend";
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.RESEND_API_URL = mock.url;
  process.env.EMAIL_FROM = "Shree Krishna Associate <noreply@example.com>";
  delete process.env.NOTIFY_EMAIL; // use the built-in default address
  process.env.SITE_URL = "https://www.example-ska.in";
});
afterAll(async () => {
  await mock.close();
});
beforeEach(async () => {
  await resetDb();
  mock.reset();
  await addListing("SKA-501");
});

describe("showing requests", () => {
  it("saves the request and emails associateshreekrishna775@gmail.com with all details", async () => {
    const res = await submitShowingRequest(form(showing()), meta());
    expect(res.status).toBe("success");
    if (res.status !== "success") return;
    expect(res.message).toMatch(/not a confirmed appointment/i);

    const [row] = await db().select().from(schema.showingRequests);
    expect(row).toMatchObject({ listingId: "SKA-501", name: "Asha Verma", email: "asha@example.com", phone: "+91 98765 43210", preferredTime: "evening", flexibility: "flexible_day", status: "new" });
    expect(row.reference).toBe(res.reference);
    expect(row.consentVersion).toBeTruthy();

    expect(mock.received).toHaveLength(1);
    const sent = mock.received[0];
    expect(sent.path).toBe("/emails");
    expect(sent.auth).toBe("Bearer re_test_key");
    expect(sent.body.to).toEqual(["associateshreekrishna775@gmail.com"]);
    expect(sent.body.reply_to).toBe("asha@example.com");
    expect(String(sent.body.subject)).toContain("Sunlit 3 BHK apartment");
    const html = String(sent.body.html);
    const text = String(sent.body.text);
    for (const part of ["Asha Verma", "asha@example.com", "+91 98765 43210", "SKA-501", "https://www.example-ska.in/property/ska-501/", "Evening", "Is covered parking included?", "IST"]) {
      expect(text, part).toContain(part);
    }
    expect(html).toContain("NOT confirmed");

    const [outbox] = await db().select().from(schema.emailOutbox);
    expect(outbox).toMatchObject({ status: "sent", provider: "resend", providerMessageId: "mock_1", relatedId: row.id });
  });

  it("keeps the request when email delivery fails, records the error and retries successfully", async () => {
    mock.failNext(1);
    const res = await submitShowingRequest(form(showing()), meta());
    expect(res.status).toBe("success");
    const [outbox] = await db().select().from(schema.emailOutbox);
    expect(outbox.status).toBe("failed");
    expect(outbox.lastError).toMatch(/503/);
    expect(outbox.nextAttemptAt).not.toBeNull();
    expect(await db().select().from(schema.showingRequests)).toHaveLength(1);

    const retry = await deliver(outbox.id);
    expect(retry.ok).toBe(true);
    const [after] = await db().select().from(schema.emailOutbox).where(eq(schema.emailOutbox.id, outbox.id));
    expect(after).toMatchObject({ status: "sent", attempts: 2 });
  });

  it("automatic retries pick up due failures", async () => {
    mock.failNext(1);
    await submitShowingRequest(form(showing()), meta());
    const [outbox] = await db().select().from(schema.emailOutbox);
    await db().update(schema.emailOutbox).set({ nextAttemptAt: new Date(Date.now() - 1000) }).where(eq(schema.emailOutbox.id, outbox.id));
    const r = await processDueEmails();
    expect(r).toEqual({ attempted: 1, sent: 1 });
  });

  it("validates fields on the server", async () => {
    const res = await submitShowingRequest(form(showing({ phone: "12345", email: "nope", preferredDate: istDate(-2), consent: "" })), meta());
    expect(res.status).toBe("error");
    if (res.status !== "error") return;
    expect(Object.keys(res.fieldErrors ?? {}).sort()).toEqual(["consent", "email", "phone", "preferredDate"]);
    expect(await db().select().from(schema.showingRequests)).toHaveLength(0);
    expect(mock.received).toHaveLength(0);
  });

  it("refuses requests for unavailable listings", async () => {
    await addListing("SKA-777", "Archived");
    const res = await submitShowingRequest(form(showing({ listingId: "SKA-777" })), meta());
    expect(res.status).toBe("error");
    expect(await db().select().from(schema.showingRequests)).toHaveLength(0);
  });

  it("blocks spam: honeypot, instant submissions, forged tokens and floods", async () => {
    const honeypot = form(showing());
    honeypot.set("company_website", "http://spam.example");
    expect((await submitShowingRequest(honeypot, meta())).status).toBe("success"); // bots are told "success"…
    expect(await db().select().from(schema.showingRequests)).toHaveLength(0); // …but nothing is saved or sent

    const tooFast = await submitShowingRequest(form(showing(), { tokenAgeMs: 500 }), meta());
    expect(tooFast.status).toBe("error");

    const forged = form(showing());
    forged.set("form_token", `${Math.floor(Date.now() / 1000) - 60}.forged`);
    expect((await submitShowingRequest(forged, meta())).status).toBe("error");

    const wrongForm = await submitShowingRequest(form(showing(), { form: "contact" }), meta());
    expect(wrongForm.status).toBe("error");

    const sameIp = { ip: "198.51.100.7", userAgent: "x" };
    const results = [];
    for (let i = 0; i < 9; i++) results.push((await submitShowingRequest(form(showing()), sameIp)).status);
    expect(results.slice(0, 8).every((s) => s === "success")).toBe(true);
    expect(results[8]).toBe("error");
    expect(mock.received).toHaveLength(8);
  });
});

describe("seller and contact enquiries", () => {
  it("saves a seller enquiry and emails the business", async () => {
    const res = await submitSellerEnquiry(
      form(
        {
          enquiryType: "sell", ownerName: "Ravi Kumar", email: "ravi@example.com", phone: "+91 91234 56789", preferredContact: "whatsapp",
          locality: "Kothrud", city: "Pune", state: "Maharashtra", pincode: "411038", propertyType: "apartment", areaValue: "1100",
          areaUnit: "sqft", areaType: "carpet", bedrooms: "2", expectedPrice: "1.05 Cr", details: "Second floor, east facing", consent: "on",
        },
        { form: "seller" },
      ),
      meta(),
    );
    expect(res.status).toBe("success");
    const [row] = await db().select().from(schema.sellerEnquiries);
    expect(row).toMatchObject({ ownerName: "Ravi Kumar", expectedPrice: 10_500_000, city: "Pune", propertyType: "apartment" });
    expect(mock.received[0].body.to).toEqual(["associateshreekrishna775@gmail.com"]);
    expect(String(mock.received[0].body.text)).toContain("₹1,05,00,000");
  });

  it("saves a contact message and emails the business", async () => {
    const res = await submitContactMessage(
      form({ name: "Meera", email: "meera@example.com", subject: "buying", message: "Looking for a 2 BHK near the station.", consent: "on" }, { form: "contact" }),
      meta(),
    );
    expect(res.status).toBe("success");
    expect(await db().select().from(schema.contactMessages)).toHaveLength(1);
    expect(mock.received[0].body.to).toEqual(["associateshreekrishna775@gmail.com"]);
  });
});
