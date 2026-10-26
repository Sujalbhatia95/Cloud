"use client";

import { useId, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Common = {
  name: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
};

function Wrapper({ id, label, error, hint, required, className, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {required ? <span className="text-danger" aria-hidden> *</span> : <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField(
  props: Common & {
    type?: string;
    defaultValue?: string;
    placeholder?: string;
    autoComplete?: string;
    inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
    min?: string;
    max?: string;
    maxLength?: number;
    pattern?: string;
    list?: string;
  },
) {
  const id = useId();
  const { name, error, hint, required, type = "text", defaultValue, placeholder, autoComplete, inputMode, min, max, maxLength, pattern, list } = props;
  return (
    <Wrapper {...props} id={id}>
      <input
        id={id}
        name={name}
        type={type}
        className="field"
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        min={min}
        max={max}
        maxLength={maxLength}
        pattern={pattern}
        list={list}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
    </Wrapper>
  );
}

export function SelectField(
  props: Common & { options: readonly (readonly [string, string])[]; defaultValue?: string; placeholder?: string },
) {
  const id = useId();
  const { name, error, hint, required, options, defaultValue, placeholder } = props;
  return (
    <Wrapper {...props} id={id}>
      <select
        id={id}
        name={name}
        className="field"
        required={required}
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      >
        {placeholder !== undefined ? (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        ) : null}
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

export function TextAreaField(props: Common & { defaultValue?: string; placeholder?: string; maxLength?: number; rows?: number }) {
  const id = useId();
  const { name, error, hint, required, defaultValue, placeholder, maxLength, rows } = props;
  return (
    <Wrapper {...props} id={id}>
      <textarea
        id={id}
        name={name}
        className="field"
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows ?? 4}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
    </Wrapper>
  );
}

export function CheckboxField({
  name,
  children,
  error,
  required,
  defaultChecked,
}: {
  name: string;
  children: ReactNode;
  error?: string;
  required?: boolean;
  defaultChecked?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          required={required}
          defaultChecked={defaultChecked}
          className="mt-0.5 h-5 w-5 shrink-0 accent-royal"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <label htmlFor={id} className="text-[0.82rem] leading-relaxed text-muted">
          {children}
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ children, pendingText, className = "btn btn-primary w-full" }: { children: ReactNode; pendingText: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormMessage({ state }: { state: { status: string; message?: string } }) {
  if (state.status !== "error" || !state.message) return null;
  return (
    <div role="alert" className="border-l-4 border-danger bg-danger-50 px-4 py-3 text-sm text-danger">
      {state.message}
    </div>
  );
}
