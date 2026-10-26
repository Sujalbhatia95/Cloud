"use client";

import { CleanForm as Form } from "@/components/search/CleanForm";
import { useState } from "react";
import { IconSearch } from "@/components/ui/icons";
import { PROPERTY_TYPES } from "@/lib/listings/constants";
import { formatInrCompact } from "@/lib/listings/format";
import { BUY_PRICE_STEPS, RENT_PRICE_STEPS } from "@/lib/listings/search-params";

const TABS = [
  { key: "buy", label: "Buy", action: "/buy" },
  { key: "rent", label: "Rent", action: "/rent" },
  { key: "commercial", label: "Commercial", action: "/commercial" },
] as const;

export function HeroSearch({ datalistId }: { datalistId: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("buy");
  const current = TABS.find((t) => t.key === tab)!;
  const steps = tab === "rent" ? RENT_PRICE_STEPS : BUY_PRICE_STEPS;
  const types = Object.entries(PROPERTY_TYPES).filter(([, v]) =>
    tab === "commercial" ? v.category === "commercial" : v.category !== "commercial",
  );

  return (
    <div className="w-full max-w-4xl">
      <div role="tablist" aria-label="Search type" className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            aria-controls="hero-search-form"
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-semibold tracking-wide transition-colors ${
              tab === t.key ? "bg-white text-navy" : "bg-navy-900/45 text-white hover:bg-navy-900/65"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Form
        id="hero-search-form"
        action={current.action}
        className="grid gap-px bg-stone shadow-[var(--shadow-lift)] sm:grid-cols-[1.6fr_1fr_1fr_auto]"
      >
        <label className="flex flex-col bg-white px-4 py-3">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted">Location</span>
          <input
            name="q"
            list={datalistId}
            autoComplete="off"
            placeholder="City, locality or PIN code"
            className="mt-1 w-full bg-transparent text-[0.95rem] text-ink placeholder:text-stone-400 focus:outline-none"
          />
        </label>
        <label className="flex flex-col bg-white px-4 py-3">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted">Property type</span>
          <select name="type" defaultValue="" className="mt-1 w-full bg-transparent text-[0.95rem] text-ink focus:outline-none">
            <option value="">Any type</option>
            {types.map(([key, v]) => (
              <option key={key} value={key}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col bg-white px-4 py-3">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted">
            {tab === "rent" ? "Max rent / month" : "Max budget"}
          </span>
          <select key={tab} name="maxPrice" defaultValue="" className="mt-1 w-full bg-transparent text-[0.95rem] text-ink focus:outline-none">
            <option value="">No limit</option>
            {steps.map((v) => (
              <option key={v} value={v}>
                {formatInrCompact(v)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary h-full min-h-[3.5rem] rounded-none px-7">
          <IconSearch size={18} />
          Search
        </button>
      </Form>
    </div>
  );
}
