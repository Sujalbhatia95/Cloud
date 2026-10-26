import Script from "next/script";
import { atRequestTime } from "@/lib/request-time";
import { HONEYPOT_FIELD, TOKEN_FIELD, issueFormToken } from "@/lib/forms/spam";

/**
 * Server-rendered anti-spam fields: a signed timestamp and a honeypot input that people never see.
 * Adds a Cloudflare Turnstile widget when NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured.
 */
export async function SpamFields({ form }: { form: string }) {
  await atRequestTime();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return (
    <>
      <input type="hidden" name={TOKEN_FIELD} value={issueFormToken(form)} />
      <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      {siteKey ? (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" />
        </>
      ) : null}
    </>
  );
}
