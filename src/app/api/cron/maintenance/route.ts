import { cronAuthorized } from "@/lib/cron-auth";
import { purgeExpiredEnquiries } from "@/lib/retention";

/** Daily: deletes enquiries past the retention period, expired sessions and old rate-limit rows. */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await purgeExpiredEnquiries();
  return Response.json({ ok: true, ...result });
}
