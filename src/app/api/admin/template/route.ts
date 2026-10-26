import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { buildTemplateCsv, buildTemplateXlsx } from "@/lib/import/template";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (!can(user.role, "imports")) return Response.json({ error: "Forbidden" }, { status: 403 });
  const format = new URL(request.url).searchParams.get("format") ?? "xlsx";
  if (format === "csv" || format === "csv-example") {
    return new Response(buildTemplateCsv(format === "csv-example"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shree-krishna-listings-${format === "csv" ? "template" : "example"}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const buf = await buildTemplateXlsx();
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="shree-krishna-listings-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
