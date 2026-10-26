"use client";

import { useActionState, type ReactNode } from "react";
import { sellerEnquiryAction } from "@/app/actions/public";
import { IconCheck } from "@/components/ui/icons";
import type { FormState } from "@/lib/enquiries";
import { SELLER_ENQUIRY_TYPES } from "@/lib/forms/schemas";
import { AREA_TYPES, AREA_UNITS, INDIAN_STATES_AND_UTS, PROPERTY_TYPES } from "@/lib/listings/constants";
import { ConsentFields } from "./Consent";
import { FormMessage, SelectField, SubmitButton, TextAreaField, TextField } from "./fields";

const propertyOptions = Object.entries(PROPERTY_TYPES).map(([k, v]) => [k, v.label] as const);
const stateOptions = INDIAN_STATES_AND_UTS.map((s) => [s, s] as const);

export function SellerForm({
  compact = false,
  defaults,
  valuationSnapshot,
  children,
}: {
  compact?: boolean;
  defaults?: Partial<Record<string, string>>;
  valuationSnapshot?: string;
  children: ReactNode;
}) {
  const [state, action] = useActionState<FormState, FormData>(sellerEnquiryAction, { status: "idle" });

  if (state.status === "success") {
    return (
      <div role="status" aria-live="polite" className="space-y-4 py-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-peacock-50 text-peacock">
          <IconCheck size={26} />
        </div>
        <h3 className="font-display text-3xl text-navy">Thank you</h3>
        <p className="text-sm leading-relaxed">{state.message}</p>
        {state.reference !== "—" ? (
          <p className="text-sm text-muted">
            Your reference: <strong className="font-mono text-ink">{state.reference}</strong>
          </p>
        ) : null}
      </div>
    );
  }

  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const v = { ...defaults, ...(state.status === "error" ? state.values : {}) };

  return (
    <form action={action} className="relative space-y-5">
      <FormMessage state={state} />
      {valuationSnapshot ? <input type="hidden" name="valuation_snapshot" value={valuationSnapshot} /> : null}
      {compact ? (
        <input type="hidden" name="enquiryType" value={v.enquiryType ?? "sell"} />
      ) : (
        <fieldset>
          <legend className="field-label">
            What would you like to do? <span className="text-danger" aria-hidden>*</span>
          </legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {Object.entries(SELLER_ENQUIRY_TYPES).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 border border-stone bg-white px-3 py-3 text-sm has-[:checked]:border-royal has-[:checked]:bg-royal-50">
                <input type="radio" name="enquiryType" value={key} defaultChecked={(v.enquiryType ?? "sell") === key} className="accent-royal" required />
                {label}
              </label>
            ))}
          </div>
          {errors?.enquiryType ? <p className="field-error">{errors.enquiryType}</p> : null}
        </fieldset>
      )}

      {!compact ? <h3 className="eyebrow pt-2">Owner details</h3> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="ownerName" label="Your name" required autoComplete="name" maxLength={100} error={errors?.ownerName} defaultValue={v.ownerName} className="sm:col-span-2" />
        <TextField name="phone" type="tel" label="Mobile number" required autoComplete="tel" inputMode="tel" maxLength={20} error={errors?.phone} defaultValue={v.phone} />
        <TextField name="email" type="email" label="Email" required autoComplete="email" maxLength={200} error={errors?.email} defaultValue={v.email} />
        {!compact ? (
          <SelectField
            name="preferredContact"
            label="Preferred way to contact you"
            options={[["phone", "Phone call"], ["whatsapp", "WhatsApp"], ["email", "Email"]]}
            defaultValue={v.preferredContact ?? "phone"}
            className="sm:col-span-2"
          />
        ) : null}
      </div>

      {!compact ? <h3 className="eyebrow pt-2">Property location</h3> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {!compact ? (
          <TextField name="addressLine" label="Building / street" maxLength={200} error={errors?.addressLine} defaultValue={v.addressLine} className="sm:col-span-2" hint="Optional — share the exact address later if you prefer." />
        ) : null}
        <TextField name="locality" label="Locality / area" required maxLength={100} error={errors?.locality} defaultValue={v.locality} />
        <TextField name="city" label="City" required maxLength={80} error={errors?.city} defaultValue={v.city} autoComplete="address-level2" />
        <SelectField name="state" label="State / UT" required placeholder="Choose…" options={stateOptions} error={errors?.state} defaultValue={v.state} />
        {!compact ? (
          <TextField name="pincode" label="PIN code" inputMode="numeric" maxLength={6} pattern="[1-9][0-9]{5}" error={errors?.pincode} defaultValue={v.pincode} autoComplete="postal-code" />
        ) : (
          <SelectField name="propertyType" label="Property type" required placeholder="Choose…" options={propertyOptions} error={errors?.propertyType} defaultValue={v.propertyType} />
        )}
      </div>

      {!compact ? (
        <>
          <h3 className="eyebrow pt-2">About the property</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField name="propertyType" label="Property type" required placeholder="Choose…" options={propertyOptions} error={errors?.propertyType} defaultValue={v.propertyType} />
            <TextField name="bedrooms" label="Bedrooms" inputMode="numeric" maxLength={2} error={errors?.bedrooms} defaultValue={v.bedrooms} />
            <TextField name="areaValue" label="Area" inputMode="decimal" maxLength={12} error={errors?.areaValue} defaultValue={v.areaValue} />
            <div className="grid grid-cols-2 gap-3">
              <SelectField name="areaUnit" label="Unit" options={Object.entries(AREA_UNITS).map(([k, u]) => [k, u.label] as const)} defaultValue={v.areaUnit ?? "sqft"} />
              <SelectField name="areaType" label="Area type" placeholder="—" options={Object.entries(AREA_TYPES)} defaultValue={v.areaType} />
            </div>
            <TextField name="expectedPrice" label="Expected price / rent (₹)" maxLength={30} error={errors?.expectedPrice} defaultValue={v.expectedPrice} placeholder="e.g. 85 Lakh or 1.2 Cr" className="sm:col-span-2" />
            <TextAreaField
              name="details"
              label="Supporting information"
              maxLength={2000}
              rows={4}
              error={errors?.details}
              defaultValue={v.details}
              placeholder="Floor, age, parking, approvals you hold, preferred timeline… Please don't upload or paste identity documents."
              className="sm:col-span-2"
            />
          </div>
        </>
      ) : null}

      <ConsentFields errors={errors} purpose="respond to my property enquiry" />
      {children}
      <SubmitButton pendingText="Sending…" className="btn btn-primary w-full sm:w-auto">
        {compact ? "Request a callback" : "Send my details"}
      </SubmitButton>
    </form>
  );
}
