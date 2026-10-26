import { desc } from "drizzle-orm";
import { EmptyRow, PageHeader, Table } from "@/components/admin/ui";
import { getDb, schema } from "@/db";
import { requirePage } from "@/lib/auth/guards";
import { formatDateTimeIST } from "@/lib/listings/format";

export default async function AuditPage() {
  await requirePage("audit");
  const rows = await getDb().select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(300);
  return (
    <>
      <PageHeader title="Audit log" description="The last 300 administrative actions and sign-in events." />
      <Table>
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Item</th><th>Details</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow colSpan={5} text="No events yet." /> : null}
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap text-xs">{formatDateTimeIST(r.createdAt)}</td>
              <td className="text-xs">{r.userEmail ?? "—"}</td>
              <td className="font-mono text-xs">{r.action}</td>
              <td className="text-xs">{r.entity ? `${r.entity} ${r.entityId ?? ""}` : "—"}</td>
              <td className="max-w-md break-words font-mono text-[0.7rem] text-muted">{r.details ? JSON.stringify(r.details) : ""}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
