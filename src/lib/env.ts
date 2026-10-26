import "server-only";

/**
 * Centralised, validated access to server-side environment variables.
 * Secrets are only ever read on the server; nothing here is exposed to the browser.
 */

const DEFAULT_NOTIFY_EMAIL = "associateshreekrishna775@gmail.com";

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export type EmailProviderName = "resend" | "sendgrid" | "log" | "none";

export const env = {
  get databaseUrl(): string {
    const url = read("DATABASE_URL");
    if (!url) throw new Error("DATABASE_URL is not set. See README → Database setup.");
    return url;
  },
  get siteUrl(): string {
    return (read("SITE_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
  get sessionSecret(): string {
    const secret = read("SESSION_SECRET");
    if (!secret || secret.length < 32) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("SESSION_SECRET must be set to at least 32 random characters in production.");
      }
      return "development-only-insecure-session-secret-change-me";
    }
    return secret;
  },
  get sessionSecretIsStrong(): boolean {
    const secret = read("SESSION_SECRET");
    return !!secret && secret.length >= 32 && !/change|example|secret123/i.test(secret);
  },
  get emailProvider(): EmailProviderName {
    const p = (read("EMAIL_PROVIDER") ?? "").toLowerCase();
    if (p === "resend" || p === "sendgrid" || p === "log") return p;
    if (read("RESEND_API_KEY")) return "resend";
    if (read("SENDGRID_API_KEY")) return "sendgrid";
    return process.env.NODE_ENV === "production" ? "none" : "log";
  },
  get resendApiKey() {
    return read("RESEND_API_KEY");
  },
  get resendApiUrl() {
    return (read("RESEND_API_URL") ?? "https://api.resend.com").replace(/\/+$/, "");
  },
  get sendgridApiKey() {
    return read("SENDGRID_API_KEY");
  },
  get sendgridApiUrl() {
    return (read("SENDGRID_API_URL") ?? "https://api.sendgrid.com").replace(/\/+$/, "");
  },
  get emailFrom(): string {
    return read("EMAIL_FROM") ?? "Shree Krishna Associate <onboarding@resend.dev>";
  },
  /** Where enquiry / showing notifications are delivered. Deliberately env-only so it cannot be changed from the admin UI. */
  get notifyEmail(): string {
    return read("NOTIFY_EMAIL") ?? DEFAULT_NOTIFY_EMAIL;
  },
  get cronSecret() {
    return read("CRON_SECRET");
  },
  get turnstileSecretKey() {
    return read("TURNSTILE_SECRET_KEY");
  },
  get turnstileSiteKey() {
    return read("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  },
  get trustProxyHeaders(): boolean {
    return (read("TRUST_PROXY_HEADERS") ?? "true") !== "false";
  },
};

export { DEFAULT_NOTIFY_EMAIL };
