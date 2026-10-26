import { defineConfig, devices } from "@playwright/test";
import { E2E_ENV, E2E_PORT } from "./tests/e2e/env";

/**
 * End-to-end acceptance tests against a production build (`pnpm test:e2e` builds first).
 * Uses a dedicated database (ska_e2e) and a mock Resend server — never real credentials.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    { command: "node tests/e2e/mock-email-server.mjs", url: "http://127.0.0.1:4010/", reuseExistingServer: true, timeout: 30_000 },
    {
      command: `npx next start -p ${E2E_PORT}`,
      url: `http://localhost:${E2E_PORT}/api/health`,
      env: E2E_ENV,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec/ },
  ],
});
