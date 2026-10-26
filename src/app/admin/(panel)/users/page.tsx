import { asc } from "drizzle-orm";
import { PendingButton } from "@/components/admin/ConfirmButton";
import { CreateUserForm, ResetPasswordForm } from "@/components/admin/UserForms";
import { Card, Notice, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { getDb, schema } from "@/db";
import { requirePage } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import { formatDateTimeIST } from "@/lib/listings/format";
import { updateUserAction } from "../../actions/users";

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requirePage("users");
  const sp = await searchParams;
  const users = await getDb().select().from(schema.adminUsers).orderBy(asc(schema.adminUsers.email));
  return (
    <>
      <PageHeader title="Staff accounts" description="Give each person their own account with the least access they need. Editors never see customer enquiries." />
      <Notice notice={sp.notice} error={sp.error} />
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
                  <ResetPasswordForm id={u.id} email={u.email} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Card title="Add a staff member">
          <CreateUserForm />
        </Card>
      </div>
    </>
  );
}
