import "server-only";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/security/crypto";

/** Cron endpoints require `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this automatically). */
export function cronAuthorized(request: Request): boolean {
  const secret = env.cronSecret;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return safeEqual(header, `Bearer ${secret}`);
}
