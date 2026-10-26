import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hmac(input: string, purpose: string): string {
  return createHmac("sha256", `${env.sessionSecret}:${purpose}`).update(input).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Short human-friendly reference, e.g. SR-7KQ2M9XD (no ambiguous characters). */
export function reference(prefix: string): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${prefix}-${out}`;
}

/** IP addresses are personal data: we only store a keyed hash, used for abuse prevention. */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return hmac(ip, "ip").slice(0, 32);
}
