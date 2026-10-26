"use client";

import { useActionState, type ReactNode } from "react";
import { contactAction } from "@/app/actions/public";
import { IconCheck } from "@/components/ui/icons";
import type { FormState } from "@/lib/enquiries";
import { CONTACT_SUBJECTS } from "@/lib/forms/schemas";
import { ConsentFields } from "./Consent";
import { FormMessage, SelectField, SubmitButton, TextAreaField, TextField } from "./fields";

export function ContactForm({ children }: { children: ReactNode }) {
  const [state, action] = useActionState<FormState, FormData>(contactAction, { status: "idle" });
  if (state.status === "success") {
    return (
      <div role="status" aria-live="polite" className="space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-peacock-50 text-peacock">
          <IconCheck size={26} />
        </div>
        <h3 className="font-display text-3xl text-navy">Message received</h3>
        <p className="text-sm">{state.message}</p>
        {state.reference !== "—" ? (
          <p className="text-sm text-muted">
            Reference: <strong className="font-mono text-ink">{state.reference}</strong>
          </p>
        ) : null}
      </div>
    );
  }
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const v = state.status === "error" ? state.values : undefined;
  return (
    <form action={action} className="relative space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Name" required autoComplete="name" maxLength={100} error={errors?.name} defaultValue={v?.name} />
        <TextField name="email" type="email" label="Email" required autoComplete="email" maxLength={200} error={errors?.email} defaultValue={v?.email} />
        <TextField name="phone" type="tel" label="Mobile number" autoComplete="tel" inputMode="tel" maxLength={20} error={errors?.phone} defaultValue={v?.phone} />
        <SelectField name="subject" label="Subject" required placeholder="Choose…" options={Object.entries(CONTACT_SUBJECTS)} error={errors?.subject} defaultValue={v?.subject} />
      </div>
      <TextAreaField name="message" label="Message" required maxLength={2000} rows={5} error={errors?.message} defaultValue={v?.message} />
      <ConsentFields errors={errors} purpose="reply to my message" />
      {children}
      <SubmitButton pendingText="Sending…" className="btn btn-primary w-full sm:w-auto">
        Send message
      </SubmitButton>
    </form>
  );
}
