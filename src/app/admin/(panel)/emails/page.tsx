import { desc, eq } from "drizzle-orm";
import { PendingButton } from "@/components/admin/ConfirmButton";
import { Card, EmptyRow, Notice, PageHeader, StatusBadge, Table, first } from "@/components/admin/ui";
import { getDb, schema } from "@/db";
import { requirePage } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { formatDateTimeIST } from "@/lib/listings/format";
import { retryEmailAction, sendTestEmailAction } from "../../actions/enquiries";

export default async function EmailsPage({ searchParams }: PageProps<"/admin/emails">) {
  await requirePage("emails");
  const sp = await searchParams;
  const status = first(sp.status);
  const O = schema.emailOutbox;
  const rows = await getDb()
    .select({ id: O.id, kind: O.kind, toAddress: O.toAddress, subject: O.subject, status: O.status, attempts: O.attempts, lastError: O.lastError, provider: O.provider, createdAt: O.createdAt, sentAt: O.sentAt, nextAttemptAt: O.nextAttemptAt })
    .from(O)
    .where(status ? eq(O.status, status) : undefined)
    .orderBy(desc(O.createdAt))
    .limit(200);
  const provider = env.emailProvider;
  return (
    <>
      <PageHeader title="Email delivery" description="Every enquiry notification is stored here first, then sent. Failed messages are retried automatically and can be retried manually." />
      <Notice notice={sp.notice} error={sp.error} />
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card title="Configuration">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Provider</dt><dd className="font-semibold">{provider}{provider === "log" ? " (development — emails are only logged)" : provider === "none" ? " (not configured)" : ""}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">From</dt><dd>{env.emailFrom}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Notifications go to</dt><dd className="font-semibold">{env.notifyEmail}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Automatic retries</dt><dd>{env.cronSecret ? "Enabled (cron)" : "Set CRON_SECRET to enable"}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted">These values come from server environment variables and cannot be changed here (see README → Email).</p>
        </Card>
        <Card title="Send a test email">
          <p className="mb-4 text-sm text-muted">Sends a short test message to {env.notifyEmail} through the configured provider.</p>
          <form action={sendTestEmailAction}>
            <PendingButton pendingText="Sending…">Send test email</PendingButton>
          </form>
        </Card>
      </div>
      <form className="mb-4 flex gap-2">
        <select name="status" defaultValue={status} className="field max-w-xs" aria-label="Status">
          <option value="">All</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
        </select>
        <button className="btn btn-dark" type="submit">Filter</button>
      </form>
      <Table>
        <thead><tr><th>Created</th><th>Type</th><th>Subject</th><th>Status</th><th>Details</th><th /></tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow colSpan={6} text="No emails." /> : null}
          {rows.map((m) => (
            <tr key={m.id}>
              <td className="whitespace-nowrap text-xs">{formatDateTimeIST(m.createdAt)}</td>
              <td className="text-xs">{m.kind.replace(/_/g, " ")}</td>
              <td className="text-xs">{m.subject}<br /><span className="text-muted">to {m.toAddress}</span></td>
              <td><StatusBadge status={m.status} /></td>
              <td className="text-xs">
                {m.attempts} attempt(s){m.provider ? ` · ${m.provider}` : ""}
                {m.sentAt ? <><br />sent {formatDateTimeIST(m.sentAt)}</> : null}
                {m.nextAttemptAt && m.status === "failed" ? <><br />next retry {formatDateTimeIST(m.nextAttemptAt)}</> : null}
                {m.lastError ? <p className="mt-1 max-w-sm text-danger">{m.lastError}</p> : null}
              </td>
              <td>
                {m.status === "failed" || m.status === "pending" ? (
                  <form action={retryEmailAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="back" value={`/admin/emails${status ? `?status=${status}` : ""}`} />
                    <PendingButton className="btn btn-outline btn-sm" pendingText="Sending…">Retry</PendingButton>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
