import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { resultsToCsv } from "@/lib/import/report";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/imports/[id]/report">) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (!can(user.role, "imports")) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const [b] = await getDb()
    .select({ results: schema.importBatches.results, filename: schema.importBatches.filename })
    .from(schema.importBatches)
    .where(eq(schema.importBatches.id, id))
    .limit(1);
  if (!b || !b.results) return Response.json({ error: "No report available yet — run the preview first." }, { status: 404 });
  const onlyProblems = new URL(request.url).searchParams.get("only") === "problems";
  const base = b.filename.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_").slice(0, 60);
  return new Response(resultsToCsv(b.results, onlyProblems), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}-${onlyProblems ? "errors" : "report"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
