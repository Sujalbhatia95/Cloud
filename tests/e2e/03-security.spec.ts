/**
 * Acceptance test 7: admin routes and private enquiries are protected; roles limit access.
 */
import { expect, login, test } from "./fixtures";
import { E2E_ENV } from "./env";

test("signed-out visitors cannot reach any admin page, API or enquiry", async ({ page, request }) => {
  for (const path of ["/admin", "/admin/listings", "/admin/imports", "/admin/enquiries", "/admin/enquiries?tab=sellers", "/admin/settings", "/admin/users"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/admin\/login/);
  }
  for (const path of ["/api/admin/template?format=csv", "/api/admin/imports/00000000-0000-0000-0000-000000000000/report"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(401);
  }
});

test("a forged session cookie is rejected", async ({ page, context }) => {
  await context.addCookies([{ name: "ska_admin", value: "forged-token-value", url: "http://localhost:3100" }]);
  await page.goto("/admin/enquiries");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("wrong passwords are rejected without revealing which part was wrong", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("owner@e2e.test");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText("Incorrect email or password.");
  await page.getByLabel("Email").fill("nobody@e2e.test");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText("Incorrect email or password.");
});

test("editors manage listings but cannot see customer enquiries or settings", async ({ page }) => {
  await login(page, "editor");
  await expect(page.getByRole("link", { name: "Spreadsheet imports" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Enquiries & showings" })).toHaveCount(0);
  for (const path of ["/admin/enquiries", "/admin/settings", "/admin/users", "/admin/compliance"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/admin\?denied=1/);
  }
  const res = await page.request.get("/api/admin/template?format=csv");
  expect(res.status()).toBe(200);
});

test("agents see enquiries but cannot import listings or change settings", async ({ page }) => {
  await login(page, "agent");
  await page.goto("/admin/imports");
  await expect(page).toHaveURL(/\/admin\?denied=1/);
  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/admin\?denied=1/);
  const res = await page.request.get("/api/admin/template?format=csv");
  expect(res.status()).toBe(403);
  await page.goto("/admin/enquiries");
  await expect(page.getByRole("heading", { name: "Enquiries & showings" })).toBeVisible();
});

test("signing out ends the session", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("cron endpoints require the secret", async ({ request }) => {
  expect((await request.get("/api/cron/email-retry")).status()).toBe(401);
  expect((await request.get("/api/cron/email-retry", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  const ok = await request.get("/api/cron/email-retry", { headers: { authorization: `Bearer ${E2E_ENV.CRON_SECRET}` } });
  expect(ok.status()).toBe(200);
});

test("security headers are sent; admin pages are not indexed or cached", async ({ request }) => {
  const home = await request.get("/");
  expect(home.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  expect(home.headers()["x-powered-by"]).toBeUndefined();
  const admin = await request.get("/admin/login");
  expect(admin.headers()["x-robots-tag"]).toContain("noindex");
  expect(admin.headers()["cache-control"]).toContain("no-store");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
});
