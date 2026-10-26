import { PageHeader, first } from "@/components/admin/ui";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { requirePage } from "@/lib/auth/guards";

export default async function AccountPage({ searchParams }: PageProps<"/admin/account">) {
  const user = await requirePage("dashboard", { allowPasswordChange: true });
  const sp = await searchParams;
  const firstTime = user.mustChangePassword || first(sp.first) === "1";
  return (
    <>
      <PageHeader title="My account" description={`${user.name} · ${user.email}`} />
      {firstTime ? (
        <div role="alert" className="mb-6 border-l-4 border-gold bg-gold-100 p-4 text-sm text-gold-700">
          You are using a temporary password. Choose a new password to continue.
        </div>
      ) : null}
      <div className="max-w-md">
        <ChangePasswordForm />
      </div>
    </>
  );
}
