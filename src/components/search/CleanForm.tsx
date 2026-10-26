"use client";

import Form from "next/form";
import type { ComponentProps, FormEvent } from "react";

/** GET search form that omits empty fields from the URL (keeps shareable links short and readable). */
export function CleanForm(props: Omit<ComponentProps<typeof Form>, "onSubmit">) {
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const disabled: (HTMLInputElement | HTMLSelectElement)[] = [];
    for (const el of Array.from(e.currentTarget.elements)) {
      if ((el instanceof HTMLInputElement || el instanceof HTMLSelectElement) && el.name && el.value === "" && !el.disabled) {
        el.disabled = true;
        disabled.push(el);
      }
    }
    setTimeout(() => disabled.forEach((el) => (el.disabled = false)), 0);
  }
  return <Form {...props} onSubmit={onSubmit} />;
}
