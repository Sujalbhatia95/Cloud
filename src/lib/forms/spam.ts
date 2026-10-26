import "server-only";
import { env } from "@/lib/env";
import { hmac, safeEqual } from "@/lib/security/crypto";

/**
 * Layered spam protection for public forms:
 *  1. Honeypot field that humans never see.
 *  2. Signed render-time token: rejects submissions faster than a human could type,
 *     replayed tokens older than 4 hours, and forms posted without loading the page.
 *  3. Database rate limit per IP (see rate-limit.ts).
 *  4. Optional Cloudflare Turnstile when TURNSTILE_SECRET_KEY is configured.
 */
export const HONEYPOT_FIELD = "company_website";
export const TOKEN_FIELD = "form_token";
const MIN_SECONDS = 3;
const MAX_SECONDS = 4 * 3600;

export function issueFormToken(form: string, now = Date.now()): string {
  const ts = String(Math.floor(now / 1000));
  return `${ts}.${hmac(`${form}:${ts}`, "form-token")}`;
}

export type SpamCheck = { ok: true } | { ok: false; silent: boolean; message: string };

export async function checkSpam(form: string, data: FormData, ip: string | null, now = Date.now()): Promise<SpamCheck> {
  const honeypot = String(data.get(HONEYPOT_FIELD) ?? "");
  if (honeypot.trim() !== "") return { ok: false, silent: true, message: "honeypot" };

  const token = String(data.get(TOKEN_FIELD) ?? "");
  const [ts, sig] = token.split(".");
  if (!ts || !sig || !/^\d+$/.test(ts) || !safeEqual(sig, hmac(`${form}:${ts}`, "form-token")))
    return { ok: false, silent: false, message: "This form has expired. Please reload the page and try again." };
  const age = now / 1000 - Number(ts);
  if (age < MIN_SECONDS) return { ok: false, silent: false, message: "That was very quick! Please wait a moment and submit again." };
  if (age > MAX_SECONDS) return { ok: false, silent: false, message: "This form has expired. Please reload the page and try again." };

  if (env.turnstileSecretKey) {
    const response = String(data.get("cf-turnstile-response") ?? "");
    if (!response) return { ok: false, silent: false, message: "Please complete the security check." };
    try {
      const body = new URLSearchParams({ secret: env.turnstileSecretKey, response });
      if (ip) body.set("remoteip", ip);
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body,
        signal: AbortSignal.timeout(8000),
      });
      const json = (await res.json()) as { success?: boolean };
      if (!json.success) return { ok: false, silent: false, message: "The security check failed. Please try again." };
    } catch {
      return { ok: false, silent: false, message: "The security check could not be verified. Please try again." };
    }
  }
  return { ok: true };
}
