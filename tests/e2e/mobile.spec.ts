/**
 * Acceptance test 9 (mobile): no horizontal scrolling, working menu, filters and showing CTA on a phone.
 */
import { expect, test } from "./fixtures";

const PAGES = ["/", "/buy", "/rent", "/commercial", "/property/demo-101", "/sell", "/valuation", "/about", "/contact", "/privacy", "/disclosures", "/admin/login"];

for (const path of PAGES) {
  test(`no horizontal overflow on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("mobile menu opens and navigates", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("navigation", { name: "Mobile" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Rent" }).click();
  await expect(page).toHaveURL(/\/rent$/);
  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeHidden();
});

test("filters collapse behind a button on phones", async ({ page }) => {
  await page.goto("/buy");
  const panel = page.locator("#search-filters");
  await expect(panel).toBeHidden();
  await page.getByRole("button", { name: /Filters/ }).click();
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel("Bedrooms")).toBeVisible();
});

test("sticky 'Schedule a showing' button jumps to the form", async ({ page }) => {
  await page.goto("/property/demo-102");
  const cta = page.getByRole("link", { name: "Schedule a showing" });
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page.locator("#schedule").getByLabel("Full name")).toBeInViewport();
});
