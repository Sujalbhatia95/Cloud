"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Submit button that asks for confirmation before destructive or important actions. */
export function ConfirmButton({ message, children, className = "btn btn-outline btn-sm", name, value }: { message: string; children: ReactNode; className?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

export function PendingButton({ children, className = "btn btn-primary btn-sm", pendingText = "Working…", disabled }: { children: ReactNode; className?: string; pendingText?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? pendingText : children}
    </button>
  );
}
