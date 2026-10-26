import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/**
 * Fixed-window rate limiter stored in Postgres, so it works across serverless instances.
 * Returns ok=false once `limit` hits within `windowSeconds` for the given key.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<{ ok: boolean; retryAfter: number }> {
  const res = await getDb().execute<{ count: number; window_start: Date }>(sql`
    insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then now() else rate_limits.window_start end
    returning count, window_start`);
  const row = res.rows[0];
  const elapsed = (Date.now() - new Date(row.window_start).getTime()) / 1000;
  return { ok: row.count <= limit, retryAfter: Math.max(1, Math.ceil(windowSeconds - elapsed)) };
}

export async function clearRateLimit(key: string) {
  await getDb().execute(sql`delete from rate_limits where key = ${key}`);
}

export async function purgeOldRateLimits() {
  await getDb().execute(sql`delete from rate_limits where window_start < now() - interval '2 days'`);
}
