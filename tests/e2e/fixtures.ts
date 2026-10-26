import { test as base, expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { E2E_ENV, USERS } from "./env";

let pool: Pool | null = null;
export function db() {
  pool ??= new Pool({ connectionString: E2E_ENV.DATABASE_URL, max: 2 });
  return pool;
}

let ipSeq = Math.floor(Math.random() * 200);
/** Every test gets its own client IP so per-IP rate limits never interfere between tests. */
export const test = base.extend<{ ip: string }>({
  ip: async ({}, provide) => {
    ipSeq = (ipSeq + 1) % 250;
    await provide(`198.18.${Math.floor(Math.random() * 250)}.${ipSeq + 1}`);
  },
  page: async ({ page, ip }, provide) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
    await provide(page);
  },
});
export { expect };

export async function login(page: Page, who: keyof typeof USERS = "admin") {
  const u = USERS[who];
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel("Password").fill(u.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin(\?.*)?$/);
}

export async function emails(): Promise<{ path: string; auth: string; body: Record<string, unknown> }[]> {
  return (await fetch("http://127.0.0.1:4010/__messages")).json();
}
export async function failNextEmails(count: number) {
  await fetch(`http://127.0.0.1:4010/__fail?count=${count}`, { method: "POST" });
}

/** Public forms reject submissions made less than 3 seconds after the page loaded (anti-bot). */
export async function humanPause(page: Page) {
  await page.waitForTimeout(3300);
}
