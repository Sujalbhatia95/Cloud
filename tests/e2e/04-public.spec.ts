/**
 * Acceptance tests 5, 8 and 9 in the browser: search & filters against the database, demo labels
 * and placeholders, every public form, and the demo-mode switch.
 */
import { db, emails, expect, humanPause, login, test } from "./fixtures";

test("home page: hero search, featured, locations, recent listings and seller section", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Exceptional homes");
  await expect(page.getByRole("note").first()).toContainText("Demo mode");
  await expect(page.getByRole("heading", { name: "The Collection" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where we work" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recently added" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Thinking of selling or letting your property?" })).toBeVisible();
  await expect(page.getByText("Demo listing").first()).toBeVisible();

  await page.getByRole("tab", { name: "Rent" }).click();
  await page.getByLabel("Location").first().fill("Mumbai");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/rent\?q=Mumbai/);
  await expect(page.getByRole("heading", { name: "Furnished 2 BHK near the metro station" })).toBeVisible();
});

test("search filters, sorting, pagination and clear-filters work against the database", async ({ page }) => {
  await page.goto("/buy?city=Pune&beds=3");
  const count = (await db().query(
    "select count(*)::int as n from listings where listing_status = 'active' and transaction_type = 'sale' and lower(city) = 'pune' and bedrooms >= 3",
  )).rows[0].n;
  await expect(page.getByRole("status").filter({ hasText: "propert" })).toContainText(`${count} propert`);
  await expect(page.getByRole("link", { name: "Remove filter: 3+ beds" })).toBeVisible();

  // sort by price ascending — prices on the page must be in order
  await page.goto("/buy?sort=price_asc");
  const shown = await page.locator("article p.font-display").allInnerTexts();
  const toNum = (s: string) => (s.includes("Cr") ? parseFloat(s.replace(/[^\d.]/g, "")) * 1e7 : s.includes("L") ? parseFloat(s.replace(/[^\d.]/g, "")) * 1e5 : Number(s.replace(/[^\d]/g, "")));
  const nums = shown.map(toNum);
  expect(nums.length).toBeGreaterThan(3);
  expect([...nums].sort((a, b) => a - b)).toEqual(nums);

  // pagination
  await page.goto("/buy");
  await expect(page.getByRole("navigation", { name: "Pagination" })).toBeVisible();
  await page.getByRole("navigation", { name: "Pagination" }).getByRole("link", { name: "2", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator("article").first()).toBeVisible();

  // filters through the form + clear all
  await page.goto("/buy");
  await page.getByLabel("Property type").selectOption("villa");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/type=villa/);
  await expect(page.getByRole("heading", { name: "Contemporary 4 BHK villa with private pool" })).toBeVisible();
  await page.getByRole("link", { name: "Clear all filters" }).first().click();
  await expect(page).toHaveURL(/\/buy$/);
});

test("archived and draft listings are never shown; sold listings say they are unavailable", async ({ page }) => {
  await page.goto("/buy?q=DEMO-111");
  await expect(page.getByText("No properties match these filters")).toBeVisible();
  await page.goto("/property/demo-111");
  await expect(page.getByRole("heading", { name: "This page isn't available" })).toBeVisible();
  await page.goto("/property/demo-112");
  await expect(page.getByText(/no longer available/i).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Schedule a showing" })).toHaveCount(0);
});

test("property pages show gallery, details, disclosures and a demo label", async ({ page }) => {
  await page.goto("/property/demo-107");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("under construction");
  await expect(page.getByText("Demo listing — not a real property.")).toBeVisible();
  await expect(page.getByText("[DEMO ONLY — INSERT VERIFIED RERA DETAILS IF APPLICABLE]").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Specifications" })).toBeVisible();
  await expect(page.getByText("DEMO-107").first()).toBeVisible();
  await page.goto("/property/DEMO-107/some-old-slug");
  await expect(page).toHaveURL(/\/property\/demo-107\/3-bhk-in-a-new-residential-tower/);
});

test("legal pages are drafts with unmistakable placeholders", async ({ page }) => {
  for (const path of ["/privacy", "/terms", "/disclosures"]) {
    await page.goto(path);
    await expect(page.getByText("Draft for legal review.")).toBeVisible();
    await expect(page.getByText(/\[DEMO ONLY — INSERT VERIFIED/).first()).toBeVisible();
  }
  await page.goto("/disclosures");
  await expect(page.getByText(/are not affiliated with/)).toBeVisible();
});

test("valuation calculator never fabricates data", async ({ page }) => {
  await page.goto("/valuation");
  await page.getByLabel("City *").fill("Shimla");
  await page.getByLabel("Area *").fill("1200");
  await page.getByRole("button", { name: "Calculate estimate" }).click();
  await expect(page.getByText("Not enough data")).toBeVisible();
  await page.getByLabel(/Your reference rate/).fill("8000");
  await page.getByRole("button", { name: "Calculate estimate" }).click();
  await expect(page.getByText("Illustrative calculation", { exact: true })).toBeVisible();
  await expect(page.getByText("₹96 L").first()).toBeVisible();
  await expect(page.getByText(/not a formal valuation/)).toBeVisible();
});

test("valuation uses asking prices of real listings, clearly labelled", async ({ page }) => {
  await page.goto("/valuation");
  await page.getByLabel("City *").fill("Pune");
  await page.getByLabel("Area *").fill("1000");
  await page.getByRole("button", { name: "Calculate estimate" }).click();
  await expect(page.getByText("Illustrative — based on asking prices")).toBeVisible();
  await expect(page.getByText(/Asking prices are not achieved sale prices/)).toBeVisible();
});

test("sell form submits, saves and emails the business", async ({ page }) => {
  const email = `owner+${Date.now()}@example.com`;
  await page.goto("/sell");
  const form = page.locator("form").filter({ hasText: "Owner details" });
  await form.getByLabel("Sell my property").check();
  await form.getByLabel("Your name").fill("Kiran Mehta");
  await form.getByLabel("Mobile number").fill("9123456789");
  await form.getByLabel(/^Email/).fill(email);
  await form.getByLabel("Locality / area").fill("Kothrud");
  await form.getByLabel(/^City/).fill("Pune");
  await form.getByLabel("State / UT").selectOption("Maharashtra");
  await form.getByLabel("Property type").selectOption("apartment");
  await form.getByLabel("Expected price / rent (₹)").fill("1.1 Cr");
  await form.getByLabel(/I agree that Shree Krishna Associate/).check();
  await humanPause(page);
  await form.getByRole("button", { name: "Send my details" }).click();
  await expect(page.getByRole("status")).toContainText("we have received your details");
  expect((await db().query("select expected_price from seller_enquiries where email = $1", [email])).rows[0].expected_price).toBe("11000000");
  expect((await emails()).find((m) => m.body.reply_to === email)?.body.to).toEqual(["associateshreekrishna775@gmail.com"]);
});

test("contact form submits", async ({ page }) => {
  const email = `contact+${Date.now()}@example.com`;
  await page.goto("/contact");
  await page.getByLabel(/^Name/).fill("Sunil");
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel("Subject").selectOption("renting");
  await page.getByLabel(/^Message/).fill("Looking for a furnished flat near Powai.");
  await page.getByLabel(/I agree that Shree Krishna Associate/).check();
  await humanPause(page);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText("Message received");
  expect((await db().query("select 1 from contact_messages where email = $1", [email])).rows).toHaveLength(1);
});

test("turning demo mode off hides every demo listing and the banner", async ({ page }) => {
  await login(page);
  await page.goto("/admin/settings#demo");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Turn demo mode off" }).click();
  await expect(page.getByRole("status")).toContainText("Demo mode is OFF");
  await page.goto("/buy?q=DEMO");
  await expect(page.getByText("No properties match these filters")).toBeVisible();
  await page.goto("/property/demo-101");
  await expect(page.getByRole("heading", { name: "This page isn't available" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Demo mode", { exact: false }).filter({ hasText: "illustrative samples" })).toHaveCount(0);

  await page.goto("/admin/settings#demo");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Turn demo mode on" }).click();
  await expect(page.getByRole("status")).toContainText("Demo mode is ON");
});

test("compliance checklist flags missing legal information before launch", async ({ page }) => {
  await login(page);
  await page.goto("/admin/compliance");
  await expect(page.getByText("Not ready for production launch")).toBeVisible();
  await expect(page.getByText("RERA agent registration status")).toBeVisible();
  await expect(page.getByText("Demo mode switched off")).toBeVisible();
});
