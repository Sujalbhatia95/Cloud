import "server-only";
import { env } from "@/lib/env";

export type EmailMessage = { to: string; subject: string; html: string; text: string; replyTo?: string | null };
export type SendResult =
  | { ok: true; provider: string; id: string | null }
  | { ok: false; provider: string; error: string; retryable: boolean };

/**
 * Sends through the configured transactional provider (Resend or SendGrid) using their HTTPS APIs.
 * Credentials come only from environment variables.
 */
export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const provider = env.emailProvider;
  try {
    if (provider === "resend") return await sendResend(msg);
    if (provider === "sendgrid") return await sendSendgrid(msg);
    if (provider === "log") {
      console.info(`[email:log] to=${msg.to} subject="${msg.subject}" (EMAIL_PROVIDER=log — not actually delivered)`);
      return { ok: true, provider: "log", id: null };
    }
    return {
      ok: false,
      provider: "none",
      error: "No email provider is configured. Set RESEND_API_KEY (or SENDGRID_API_KEY) and EMAIL_FROM, then retry.",
      retryable: true,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, provider, error: `Network error: ${message}`.slice(0, 500), retryable: true };
  }
}

async function sendResend(msg: EmailMessage): Promise<SendResult> {
  if (!env.resendApiKey) return { ok: false, provider: "resend", error: "RESEND_API_KEY is not set", retryable: true };
  const res = await fetch(`${env.resendApiUrl}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.text();
  if (res.ok) {
    let id: string | null = null;
    try {
      id = (JSON.parse(body) as { id?: string }).id ?? null;
    } catch {
      /* ignore */
    }
    return { ok: true, provider: "resend", id };
  }
  return { ok: false, provider: "resend", error: `Resend ${res.status}: ${body.slice(0, 400)}`, retryable: res.status === 429 || res.status >= 500 || res.status === 401 || res.status === 403 };
}

async function sendSendgrid(msg: EmailMessage): Promise<SendResult> {
  if (!env.sendgridApiKey) return { ok: false, provider: "sendgrid", error: "SENDGRID_API_KEY is not set", retryable: true };
  const from = parseFrom(env.emailFrom);
  const res = await fetch(`${env.sendgridApiUrl}/v3/mail/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.sendgridApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: msg.to }] }],
      from,
      ...(msg.replyTo ? { reply_to: { email: msg.replyTo } } : {}),
      subject: msg.subject,
      content: [
        { type: "text/plain", value: msg.text },
        { type: "text/html", value: msg.html },
      ],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.ok) return { ok: true, provider: "sendgrid", id: res.headers.get("x-message-id") };
  const body = await res.text();
  return { ok: false, provider: "sendgrid", error: `SendGrid ${res.status}: ${body.slice(0, 400)}`, retryable: res.status === 429 || res.status >= 500 || res.status === 401 || res.status === 403 };
}

function parseFrom(from: string): { email: string; name?: string } {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].replace(/^"|"$/g, "") || undefined, email: m[2] } : { email: from.trim() };
}
