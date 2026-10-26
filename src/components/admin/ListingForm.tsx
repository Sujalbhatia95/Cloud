"use client";

import { useActionState } from "react";
import { saveListingAction, type ListingFormState } from "@/app/admin/actions/listings";
import { PendingButton } from "./ConfirmButton";
import {
  AREA_TYPES,
  AREA_UNITS,
  FURNISHING,
  INDIAN_STATES_AND_UTS,
  LISTING_STATUSES,
  POSSESSION,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from "@/lib/listings/constants";
import { LISTING_FIELDS, type ListingFieldKey } from "@/lib/listings/fields";

const SELECTS: Partial<Record<ListingFieldKey, [string, string][]>> = {
  transaction_type: Object.entries(TRANSACTION_TYPES),
  property_type: Object.entries(PROPERTY_TYPES).map(([k, v]) => [k, v.label]),
  listing_status: Object.entries(LISTING_STATUSES),
  area_unit: Object.entries(AREA_UNITS).map(([k, v]) => [k, v.label]),
  area_type: Object.entries(AREA_TYPES),
  furnishing_status: Object.entries(FURNISHING),
  possession_status: Object.entries(POSSESSION),
  featured: [["no", "No"], ["yes", "Yes"]],
  price_negotiable: [["no", "No"], ["yes", "Yes"]],
  state: INDIAN_STATES_AND_UTS.map((s) => [s, s]),
};
const TEXTAREAS: ListingFieldKey[] = ["description", "amenities", "image_urls"];
const SKIP: ListingFieldKey[] = ["last_updated"];

export function ListingForm({ id, values, lockId }: { id?: string; values: Partial<Record<ListingFieldKey, string>>; lockId: boolean }) {
  const [state, action] = useActionState<ListingFormState, FormData>(saveListingAction, {});
  return (
    <form action={action} className="space-y-6">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      {state.errors?.length ? (
        <div role="alert" className="border-l-4 border-danger bg-danger-50 px-4 py-3 text-sm text-danger">
          <p className="font-semibold">Please fix the following:</p>
          <ul className="mt-1 list-disc pl-5">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {state.warnings?.length ? (
        <div className="border-l-4 border-gold bg-gold-100 px-4 py-3 text-sm text-gold-700">
          <ul className="list-disc pl-5">
            {state.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {LISTING_FIELDS.filter((f) => !SKIP.includes(f.key)).map((f) => {
          const common = {
            id: `f-${f.key}`,
            name: f.key,
            defaultValue: values[f.key] ?? "",
            required: f.required,
            className: "field",
          };
          const wide = TEXTAREAS.includes(f.key) || f.key === "title";
          return (
            <div key={f.key} className={wide ? "sm:col-span-2 lg:col-span-3" : ""}>
              <label htmlFor={common.id} className="field-label">
                {f.label}
                {f.required ? <span className="text-danger"> *</span> : null}
                <span className="ml-1 font-mono text-[0.68rem] font-normal text-muted">{f.key}</span>
              </label>
              {f.key === "listing_id" && lockId ? (
                <input {...common} readOnly aria-readonly className="field bg-sand" />
              ) : SELECTS[f.key] ? (
                <select {...common}>
                  {!f.required ? <option value="">—</option> : null}
                  {SELECTS[f.key]!.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              ) : TEXTAREAS.includes(f.key) ? (
                <textarea {...common} rows={f.key === "description" ? 6 : 4} />
              ) : (
                <input {...common} type="text" />
              )}
              <p className="field-hint">{f.help}</p>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 border-t border-stone pt-5">
        <PendingButton className="btn btn-primary" pendingText="Saving…">
          {id ? "Save changes" : "Create listing"}
        </PendingButton>
      </div>
    </form>
  );
}
