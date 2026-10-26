import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/db";

/** Uptime check: confirms the app can reach the database. */
export async function GET() {
  await connection();
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ ok: true, database: "up" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, database: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
