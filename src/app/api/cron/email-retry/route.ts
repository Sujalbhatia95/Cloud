import { cronAuthorized } from "@/lib/cron-auth";
import { processDueEmails } from "@/lib/email/outbox";

/** Retries failed notification emails whose back-off has elapsed. Schedule every 15 minutes. */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await processDueEmails(25);
  return Response.json({ ok: true, ...result });
}
