"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/forms/fields";
import { loginAction, type AuthState } from "../actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.error ? (
        <p role="alert" className="border-l-4 border-danger bg-danger-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <div>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="field" />
      </div>
      <div>
        <label htmlFor="password" className="field-label">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
