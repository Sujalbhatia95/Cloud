"use client";

import { useActionState, type ReactNode } from "react";
import { scheduleShowingAction } from "@/app/actions/public";
import { IconCheck } from "@/components/ui/icons";
import { FLEXIBILITY, SHOWING_TIMES } from "@/lib/forms/schemas";
import type { FormState } from "@/lib/enquiries";
import { ConsentFields } from "./Consent";
import { FormMessage, SelectField, SubmitButton, TextAreaField, TextField } from "./fields";

export function ShowingForm({
  listingId,
  title,
  minDate,
  maxDate,
  children,
}: {
  listingId: string;
  title: string;
  minDate: string;
  maxDate: string;
  children: ReactNode;
}) {
  const [state, action] = useActionState<FormState, FormData>(scheduleShowingAction, { status: "idle" });

  if (state.status === "success") {
    return (
      <div role="status" aria-live="polite" className="space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-peacock-50 text-peacock">
          <IconCheck size={26} />
        </div>
        <h3 className="font-display text-3xl text-navy">Request received</h3>
        <p className="text-sm leading-relaxed text-ink">{state.message}</p>
        {state.reference !== "—" ? (
          <p className="text-sm text-muted">
            Your reference: <strong className="font-mono text-ink">{state.reference}</strong>
          </p>
        ) : null}
        <p className="border-l-2 border-gold pl-3 text-xs leading-relaxed text-muted">
          Your viewing is <strong>not yet booked</strong>. Please wait for our call or message confirming the date and time before
          travelling to the property.
        </p>
      </div>
    );
  }

  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  return (
    <form action={action} className="relative space-y-4" noValidate={false}>
      <input type="hidden" name="listingId" value={listingId} />
      <div className="bg-sand px-3 py-2 text-xs text-muted">
        Property: <span className="font-semibold text-ink">{title}</span> · ID <span className="font-mono">{listingId}</span>
      </div>
      <FormMessage state={state} />
      <TextField name="name" label="Full name" required autoComplete="name" maxLength={100} error={errors?.name} defaultValue={values?.name} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <TextField name="email" type="email" label="Email" required autoComplete="email" maxLength={200} error={errors?.email} defaultValue={values?.email} />
        <TextField name="phone" type="tel" label="Mobile number" required autoComplete="tel" inputMode="tel" maxLength={20} error={errors?.phone} defaultValue={values?.phone} placeholder="98765 43210" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <TextField name="preferredDate" type="date" label="Preferred date" required min={minDate} max={maxDate} error={errors?.preferredDate} defaultValue={values?.preferredDate} />
        <SelectField name="preferredTime" label="Preferred time" required placeholder="Choose…" options={Object.entries(SHOWING_TIMES)} error={errors?.preferredTime} defaultValue={values?.preferredTime} />
      </div>
      <SelectField name="flexibility" label="How flexible are you?" required placeholder="Choose…" options={Object.entries(FLEXIBILITY)} error={errors?.flexibility} defaultValue={values?.flexibility} />
      <TextAreaField name="message" label="Message" maxLength={1000} rows={3} error={errors?.message} defaultValue={values?.message} placeholder="Anything we should know? (e.g. questions about parking or possession)" />
      <ConsentFields errors={errors} purpose="arrange this viewing" />
      {children}
      <SubmitButton pendingText="Sending request…">Request a showing</SubmitButton>
      <p className="text-center text-[0.72rem] text-muted">We will contact you to confirm. Submitting does not book an appointment.</p>
    </form>
  );
}
