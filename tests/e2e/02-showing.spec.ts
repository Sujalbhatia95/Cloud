/**
 * Acceptance test 6: showing requests are saved and emailed to associateshreekrishna775@gmail.com,
 * the visitor is told the request was received (not that the appointment is confirmed),
 * and failed deliveries are recorded and retryable from the admin.
 */
import { db, emails, expect, failNextEmails, humanPause, login, test } from "./fixtures";
import { istDatePlus } from "./helpers";

async function fillShowing(page: import("@playwright/test").Page, email: string, phone = "98765 43210") {
  const form = page.locator("#schedule form");
  await form.getByLabel("Full name").fill("Priya Sharma");
  await form.getByLabel(/^Email/).fill(email);
  await form.getByLabel("Mobile number").fill(phone);
  await form.getByLabel("Preferred date").fill(istDatePlus(4));
  await form.getByLabel("Preferred time").selectOption("morning");
  await form.getByLabel("How flexible are you?").selectOption("flexible_time");
  await form.getByLabel(/Message/).fill("Can we also see the terrace?");
  await form.getByLabel(/I agree that Shree Krishna Associate/).check();
  return form;
}

test("a visitor schedules a showing: saved, emailed, confirmation is not a booking", async ({ page }) => {
  const email = `priya+${Date.now()}@example.com`;
  await page.goto("/property/demo-102");
  await expect(page.getByRole("heading", { name: "Schedule a showing" })).toBeVisible();
  const form = await fillShowing(page, email);
  await humanPause(page);
  await form.getByRole("button", { name: "Request a showing" }).click();

  const status = page.locator("#schedule [role=status]");
  await expect(status).toContainText("Request received");
  await expect(status).toContainText("not a confirmed appointment");
  await expect(status).toContainText(/SR-[A-Z0-9]{8}/);

  const { rows } = await db().query("select * from showing_requests where email = $1", [email]);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ listing_id: "DEMO-102", name: "Priya Sharma", phone: "+91 98765 43210", preferred_time: "morning", flexibility: "flexible_time" });

  const sent = (await emails()).filter((m) => m.body.reply_to === email);
  expect(sent).toHaveLength(1);
  const m = sent[0].body as Record<string, string | string[]>;
  expect(m.to).toEqual(["associateshreekrishna775@gmail.com"]);
  expect(m.subject).toContain("3 BHK apartment with garden views");
  for (const part of ["Priya Sharma", email, "+91 98765 43210", "http://localhost:3100/property/demo-102/", "DEMO-102", "Morning", "Same day, any time", "Can we also see the terrace?", "IST"])
    expect(String(m.text), part).toContain(part);

  const { rows: outbox } = await db().query("select status, provider from email_outbox where related_id = $1", [rows[0].id]);
  expect(outbox).toEqual([{ status: "sent", provider: "resend" }]);
});

test("server-side validation rejects bad input with clear messages", async ({ page }) => {
  await page.goto("/property/demo-102");
  const form = await fillShowing(page, `bad+${Date.now()}@example.com`, "12345");
  await humanPause(page);
  await form.getByRole("button", { name: "Request a showing" }).click();
  await expect(form.getByText("Enter a valid 10-digit mobile number")).toBeVisible();
});

test("submissions faster than a human are rejected (anti-spam)", async ({ page }) => {
  const email = `bot+${Date.now()}@example.com`;
  await page.goto("/property/demo-102");
  const form = await fillShowing(page, email);
  await form.getByRole("button", { name: "Request a showing" }).click();
  await expect(form.getByRole("alert").first()).toContainText(/quick/i);
  expect((await db().query("select 1 from showing_requests where email = $1", [email])).rows).toHaveLength(0);
});

test("a failed email is recorded, the request is kept, and staff can retry it", async ({ page }) => {
  const email = `retry+${Date.now()}@example.com`;
  await failNextEmails(1);
  await page.goto("/property/demo-101");
  const form = await fillShowing(page, email);
  await humanPause(page);
  await form.getByRole("button", { name: "Request a showing" }).click();
  await expect(page.locator("#schedule [role=status]")).toContainText("Request received");
  const { rows } = await db().query(
    "select o.id, o.status, o.last_error from email_outbox o join showing_requests s on s.id = o.related_id where s.email = $1",
    [email],
  );
  expect(rows[0].status).toBe("failed");
  expect(rows[0].last_error).toContain("503");

  await login(page, "agent");
  await page.goto("/admin/emails?status=failed");
  await page.locator("tr", { hasText: "Priya Sharma" }).getByRole("button", { name: "Retry" }).first().click();
  await expect(page.getByRole("status")).toContainText("Email sent.");
  expect((await db().query("select status from email_outbox where id = $1", [rows[0].id])).rows[0].status).toBe("sent");
  expect((await emails()).some((m) => m.body.reply_to === email)).toBe(true);
});

test("staff see the request in the admin with its email status", async ({ page }) => {
  await login(page, "agent");
  await page.goto("/admin/enquiries?tab=showings");
  await page.getByRole("link", { name: "Priya Sharma" }).first().click();
  await expect(page.getByRole("heading", { name: /Showing request from Priya Sharma/ })).toBeVisible();
  await expect(page.getByText("associateshreekrishna775@gmail.com").first()).toBeVisible();
  const followUp = page.locator("form").filter({ hasText: "Internal notes" });
  await followUp.getByLabel("Status").selectOption("contacted");
  await followUp.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
});
