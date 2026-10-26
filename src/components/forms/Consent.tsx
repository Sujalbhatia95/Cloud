"use client";

import Link from "next/link";
import { CheckboxField } from "./fields";

export function ConsentFields({ errors, purpose }: { errors?: Record<string, string>; purpose: string }) {
  return (
    <div className="space-y-3 border-t border-stone pt-5">
      <CheckboxField name="consent" required error={errors?.consent}>
        I agree that Shree Krishna Associate may use the details above to {purpose}, including contacting me by phone, WhatsApp or
        email, as explained in the{" "}
        <Link href="/privacy" className="link" target="_blank">
          Privacy Notice
        </Link>
        . I can withdraw this consent at any time.
      </CheckboxField>
      <CheckboxField name="marketingConsent">
        Also send me occasional property updates (optional — not required to submit this form).
      </CheckboxField>
    </div>
  );
}
