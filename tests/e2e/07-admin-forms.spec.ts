/**
 * Acceptance test 9 (admin forms & buttons): settings, listing editor, quick status/featured buttons,
 * add listing, verified valuation data, legal content editor and staff accounts.
 */
import { USERS } from "./env";
import { db, expect, login, test } from "./fixtures";

test("business settings appear on the public site and replace placeholders", async ({ page }) => {
  await login(page);
  await page.goto("/admin/settings");
  await page.getByLabel("Registered legal name").fill("Shree Krishna Associate (Test Entity)");
  await page.locator('input[name="business.phone"]').fill("+91 90000 00000");
  await page.getByLabel(/Office address/).fill("Unit 1, Test Building, Test Road");
  await page.locator('input[name="business.city"]').fill("Pune");
  await page.locator('select[name="business.state"]').selectOption("Maharashtra");
  await page.locator('select[name="operatingState"]').selectOption("Maharashtra");
  await page.locator('select[name="rera.agentStatus"]').selectOption("registered");
  await page.getByLabel("RERA agent registration number").fill("TEST-AGENT-0001");
  await page.getByLabel("RERA authority name").fill("Test Authority");
  await page.locator('textarea[name="brokerage.sale"]').fill("Test brokerage terms for sales.");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toContainText("Settings saved.");

  await page.goto("/contact");
  await expect(page.locator("#main").getByText("+91 90000 00000")).toBeVisible();
  await expect(page.getByRole("contentinfo").getByText("+91 90000 00000")).toBeVisible();
  await expect(page.getByText("Unit 1, Test Building, Test Road, Pune, Maharashtra")).toBeVisible();
  await page.goto("/property/demo-101");
  await expect(page.getByText("RERA Agent Registration No. TEST-AGENT-0001 (Test Authority)").first()).toBeVisible();
  await expect(page.getByText("Test brokerage terms for sales.")).toBeVisible();
});

test("listing editor saves changes and old links redirect to the new address", async ({ page }) => {
  await login(page, "editor");
  const { rows } = await db().query("select id from listings where listing_id = 'E2E-3'");
  await page.goto(`/admin/listings/${rows[0].id}`);
  await page.getByLabel(/^Title/).fill("Renovated home for rent with balcony");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Saved E2E-3.");
  await page.goto("/property/e2e-3/old-title-slug");
  await expect(page).toHaveURL(/\/property\/e2e-3\/renovated-home-for-rent-with-balcony/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Renovated home for rent with balcony");
});

test("quick status and featured buttons in the listings table work", async ({ page }) => {
  await login(page, "editor");
  await page.goto("/admin/listings?q=E2E-4");
  const row = page.locator("tr", { hasText: "E2E-4" }).first();
  await row.getByLabel("Status of E2E-4").selectOption("archived");
  await row.getByRole("button", { name: "Set" }).click();
  await expect(page.getByRole("status")).toContainText("E2E-4 is now Archived.");
  await page.goto("/property/e2e-4");
  await expect(page.getByRole("heading", { name: "This page isn't available" })).toBeVisible();

  await page.goto("/admin/listings?q=E2E-7");
  await page.locator("tr", { hasText: "E2E-7" }).first().getByTitle("Toggle featured").click();
  await expect(page.getByRole("status")).toContainText("E2E-7 is now featured.");
  expect((await db().query("select featured from listings where listing_id = 'E2E-7'")).rows[0].featured).toBe(true);
});

test("a single listing can be added from the admin", async ({ page }) => {
  await login(page, "editor");
  await page.goto("/admin/listings/new");
  await page.getByLabel(/^Listing ID/).fill("ADM-1");
  await page.getByLabel(/^Title/).fill("Garden-facing 2 BHK added by staff");
  await page.getByLabel(/^Listing status/).selectOption("active");
  await page.getByLabel(/^Price \(INR\)/).fill("72 Lakh");
  await page.getByLabel(/^Locality/).fill("Aundh");
  await page.getByLabel(/^City/).fill("Pune");
  await page.getByLabel(/^State \/ UT/).selectOption("Maharashtra");
  await page.getByLabel(/^Bedrooms/).fill("2");
  await page.getByRole("button", { name: "Create listing" }).click();
  await expect(page.getByRole("status")).toContainText("Saved ADM-1.");
  await page.goto("/buy?q=ADM-1");
  await expect(page.getByRole("heading", { name: "Garden-facing 2 BHK added by staff" })).toBeVisible();
});

test("verified comparables switch the calculator to an indicative estimate", async ({ page }) => {
  await login(page, "editor");
  for (const [locality, area, price] of [["Gangapur Road", "1000", "80 Lakh"], ["College Road", "1200", "1 Cr"], ["Indira Nagar", "900", "70 Lakh"]]) {
    await page.goto("/admin/comparables");
    const form = page.locator("form").filter({ hasText: "Add comparable" });
    await form.getByLabel("City").fill("Nashik");
    await form.getByLabel("Locality").fill(locality);
    await form.getByLabel("Area", { exact: true }).fill(area);
    await form.getByLabel(/Sale price/).fill(price);
    await form.getByLabel("Transaction date").fill("2026-06-15");
    await form.getByLabel(/Source/).fill("Registered sale deed (test data)");
    await form.getByRole("button", { name: "Add comparable" }).click();
    await expect(page.getByRole("status")).toContainText("Comparable added");
  }
  await page.goto("/valuation");
  await page.getByLabel("City *").fill("Nashik");
  await page.getByLabel("Area *").fill("1000");
  await page.getByRole("button", { name: "Calculate estimate" }).click();
  await expect(page.getByText("Indicative estimate", { exact: true })).toBeVisible();
  await expect(page.getByText(/3 verified sale transactions in Nashik/)).toBeVisible();
});

test("legal page editor publishes changes and the review flag removes the draft banner", async ({ page }) => {
  await login(page);
  await page.goto("/admin/content/terms");
  const body = page.getByLabel("Page text (Markdown)");
  await body.fill(`${await body.inputValue()}\n\n## 10. Test clause\n\nThis clause was added in an automated test.`);
  await page.getByLabel(/reviewed and approved by a qualified lawyer/).check();
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expect(page.getByRole("status")).toContainText("Page saved and published.");
  await page.goto("/terms");
  await expect(page.getByText("This clause was added in an automated test.")).toBeVisible();
  await expect(page.getByText("Draft for legal review.")).toHaveCount(0);
});

test("new staff accounts get a temporary password and must change it", async ({ page, browser }) => {
  await login(page);
  await page.goto("/admin/users");
  const form = page.locator("form").filter({ hasText: "Create account" });
  await form.getByLabel("Name").fill("New Agent");
  await form.getByLabel("Email").fill("new.agent@e2e.test");
  await form.getByLabel("Role").selectOption("agent");
  await form.getByRole("button", { name: "Create account" }).click();
  const temp = await page.locator("code").first().innerText();
  expect(temp.length).toBeGreaterThanOrEqual(12);

  const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "198.19.0.77" } });
  const p2 = await ctx.newPage();
  await p2.goto("/admin/login");
  await p2.getByLabel("Email").fill("new.agent@e2e.test");
  await p2.getByLabel("Password").fill(temp);
  await p2.getByRole("button", { name: "Sign in" }).click();
  await expect(p2).toHaveURL(/\/admin\/account\?first=1/);
  await p2.goto("/admin/enquiries");
  await expect(p2).toHaveURL(/\/admin\/account\?first=1/); // blocked until the password is changed
  await p2.getByLabel("Current password").fill(temp);
  await p2.getByLabel(/^New password/).fill("Lotus-River-8452!");
  await p2.getByLabel("Confirm new password").fill("Lotus-River-8452!");
  await p2.getByRole("button", { name: "Change password" }).click();
  await expect(p2.getByRole("status")).toContainText("Password updated.");
  await p2.goto("/admin/enquiries");
  await expect(p2.getByRole("heading", { name: "Enquiries & showings" })).toBeVisible();
  await ctx.close();
  expect(USERS.admin.email).toBeTruthy();
});
