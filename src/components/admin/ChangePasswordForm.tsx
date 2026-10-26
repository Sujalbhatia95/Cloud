"use client";

import Link from "next/link";
import { useActionState } from "react";
import { changePasswordAction, type AuthState } from "@/app/admin/actions/auth";
import { PendingButton } from "./ConfirmButton";

export function ChangePasswordForm() {
  const [state, action] = useActionState<AuthState, FormData>(changePasswordAction, {});
  if (state.ok)
    return (
      <div role="status" className="border-l-4 border-peacock bg-peacock-50 p-4 text-sm text-peacock">
        {state.ok} <Link href="/admin" className="underline">Go to the dashboard</Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4 border border-stone bg-white p-6">
      {state.error ? <p role="alert" className="border-l-4 border-danger bg-danger-50 px-3 py-2 text-sm text-danger">{state.error}</p> : null}
      <label className="block"><span className="field-label">Current password</span><input name="current" type="password" autoComplete="current-password" required className="field" /></label>
      <label className="block">
        <span className="field-label">New password</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={12} className="field" />
        <span className="field-hint block">At least 12 characters, mixing three of: lower-case, upper-case, numbers, symbols.</span>
      </label>
      <label className="block"><span className="field-label">Confirm new password</span><input name="confirm" type="password" autoComplete="new-password" required minLength={12} className="field" /></label>
      <PendingButton className="btn btn-primary" pendingText="Saving…">Change password</PendingButton>
    </form>
  );
}
