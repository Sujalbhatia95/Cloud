import { connection } from "next/server";

/**
 * Marks the caller as request-time work so Next.js never runs database queries while
 * prerendering at build time. Outside Next.js (tests, scripts) it is a no-op.
 */
export async function atRequestTime(): Promise<void> {
  if (!process.env.NEXT_RUNTIME) return;
  await connection();
}
