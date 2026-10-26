/** Environment for the production build used by the end-to-end tests (never real credentials). */
export const E2E_PORT = 3100;
export const E2E_ENV: Record<string, string> = {
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://postgres:pgdevpass@127.0.0.1:5432/ska_e2e",
  DATABASE_SSL: "disable",
  SITE_URL: `http://localhost:${E2E_PORT}`,
  SESSION_SECRET: "e2e-only-session-secret-6b1d0f4c9a2e8b7d3c5f1a0e",
  EMAIL_PROVIDER: "resend",
  RESEND_API_KEY: "re_e2e_test_key",
  RESEND_API_URL: "http://127.0.0.1:4010",
  EMAIL_FROM: "Shree Krishna Associate <noreply@example.com>",
  CRON_SECRET: "e2e-cron-secret-value",
  TRUST_PROXY_HEADERS: "true",
};
export const USERS = {
  admin: { email: "owner@e2e.test", password: "Peacock-Flute-7391!", name: "E2E Owner" },
  editor: { email: "editor@e2e.test", password: "Marble-Window-4826!", name: "E2E Editor" },
  agent: { email: "agent@e2e.test", password: "Copper-Garden-5937!", name: "E2E Agent" },
};
