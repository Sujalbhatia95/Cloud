/**
 * The site's public base URL, without a trailing slash: SITE_URL when set, otherwise the
 * production domain Vercel provides (VERCEL_PROJECT_PRODUCTION_URL), otherwise localhost.
 * Plain module (no "server-only") so next.config.ts can use it too.
 */
export function siteUrlFromEnv(): string {
  const explicit = process.env.SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const url = explicit || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}

/** True when the URL comes from Vercel's default domain because SITE_URL was not set. */
export function siteUrlIsVercelDefault(): boolean {
  return !process.env.SITE_URL?.trim() && !!process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
}
