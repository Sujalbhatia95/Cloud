"use client";

import { useActionState } from "react";
import { createUserAction, resetUserPasswordAction, type TempPasswordState } from "@/app/admin/actions/users";
import { ROLES } from "@/lib/auth/roles";
import { PendingButton } from "./ConfirmButton";

function TempPasswordNotice({ state }: { state: TempPasswordState }) {
  if (state.error) return <p role="alert" className="border-l-4 border-danger bg-danger-50 px-3 py-2 text-sm text-danger">{state.error}</p>;
  if (!state.temp) return null;
  return (
    <div role="status" className="border-l-4 border-royal bg-royal-50 p-3 text-sm">
      <p className="font-semibold">{state.reset ? "Password reset" : "Account created"} for {state.email}.</p>
      <p className="mt-1">
        Temporary password (shown once — share it securely, e.g. in person or by phone):{" "}
        <code className="bg-white px-2 py-0.5 font-mono text-base">{state.temp}</code>
      </p>
      <p className="mt-1 text-muted">They must choose a new password when they first sign in.</p>
    </div>
  );
}

export function CreateUserForm() {
  const [state, action] = useActionState<TempPasswordState, FormData>(createUserAction, {});
  return (
    <form action={action} className="space-y-3">
      <TempPasswordNotice state={state} />
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
  );
}

export function ResetPasswordForm({ id, email }: { id: string; email: string }) {
  const [state, action] = useActionState<TempPasswordState, FormData>(resetUserPasswordAction, {});
  return (
    <form
      action={action}
      className="space-y-2"
      onSubmit={(e) => {
        if (!window.confirm(`Reset the password for ${email}? They will be signed out everywhere.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <PendingButton className="btn btn-outline btn-sm">Reset password</PendingButton>
      <TempPasswordNotice state={state} />
    </form>
  );
}
