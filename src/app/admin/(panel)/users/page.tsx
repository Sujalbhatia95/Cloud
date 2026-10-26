import { asc } from "drizzle-orm";
import { ConfirmButton, PendingButton } from "@/components/admin/ConfirmButton";
import { Card, Notice, PageHeader, StatusBadge, Table, first } from "@/components/admin/ui";
import { getDb, schema } from "@/db";
import { requirePage } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import { formatDateTimeIST } from "@/lib/listings/format";
import { createUserAction, resetUserPasswordAction, updateUserAction } from "../../actions/users";

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requirePage("users");
  const sp = await searchParams;
  const users = await getDb().select().from(schema.adminUsers).orderBy(asc(schema.adminUsers.email));
  const created = first(sp.created);
  const temp = first(sp.temp);
  return (
    <>
      <PageHeader title="Staff accounts" description="Give each person their own account with the least access they need. Editors never see customer enquiries." />
      <Notice notice={sp.notice} error={sp.error} />
      {created && temp ? (
        <div role="status" className="mb-6 border-l-4 border-royal bg-royal-50 p-4 text-sm">
          <p className="font-semibold">{first(sp.reset) ? "Password reset" : "Account created"} for {created}.</p>
          <p className="mt-1">Temporary password (shown once — share it securely, e.g. in person or by phone): <code className="bg-white px-2 py-0.5 font-mono text-base">{temp}</code></p>
          <p className="mt-1 text-muted">They must choose a new password when they first sign in.</p>
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Table>
          <thead><tr><th>User</th><th>Role & access</th><th>Last sign-in</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <p className="font-semibold">{u.name} {u.id === me.id ? <span className="text-xs text-muted">(you)</span> : null}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                  <p className="mt-1 flex gap-1">
                    {!u.isActive ? <StatusBadge status="cancelled" label="Disabled" /> : null}
                    {u.mustChangePassword ? <StatusBadge status="warning" label="Temporary password" /> : null}
                  </p>
                </td>
                <td>
                  <form action={updateUserAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" defaultValue={u.role} className="field !min-h-8 !py-1 text-xs" aria-label={`Role for ${u.email}`}>
                      {Object.keys(ROLES).map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={u.isActive} className="accent-royal" /> Active</label>
                    <PendingButton className="btn btn-outline btn-sm !min-h-8">Save</PendingButton>
                  </form>
                </td>
                <td className="text-xs">{u.lastLoginAt ? formatDateTimeIST(u.lastLoginAt) : "Never"}</td>
                <td>
                  <form action={resetUserPasswordAction}>
                    <input type="hidden" name="id" value={u.id} />
                    <ConfirmButton message={`Reset the password for ${u.email}? They will be signed out everywhere.`}>Reset password</ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Card title="Add a staff member">
          <form action={createUserAction} className="space-y-3">
            <label className="block"><span className="field-label">Name</span><input name="name" required className="field" maxLength={100} /></label>
            <label className="block"><span className="field-label">Email</span><input name="email" type="email" required className="field" maxLength={200} /></label>
            <label className="block">
              <span className="field-label">Role</span>
              <select name="role" className="field" defaultValue="agent">
                {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <PendingButton>Create account</PendingButton>
          </form>
        </Card>
      </div>
    </>
  );
}
