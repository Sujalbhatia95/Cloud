"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { valuationAction } from "@/app/actions/public";
import { IconInfo } from "@/components/ui/icons";
import { AREA_TYPES, AREA_UNITS, PROPERTY_TYPES } from "@/lib/listings/constants";
import { formatInrCompact, formatInrFull } from "@/lib/listings/format";
import type { ValuationResult } from "@/lib/valuation";
import { SellerForm } from "./SellerForm";

const METHOD_LABEL = {
  verified_comparables: { badge: "Indicative estimate", tone: "badge-green" },
  listing_asking_prices: { badge: "Illustrative — based on asking prices", tone: "badge-gold" },
  user_rate: { badge: "Illustrative calculation", tone: "badge-gold" },
  insufficient_data: { badge: "Not enough data", tone: "badge-muted" },
} as const;

export function ValuationCalculator({ spamFields }: { spamFields: ReactNode }) {
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = Object.fromEntries(Array.from(fd.entries()).map(([k, val]) => [k, String(val)]));
    setInputs(v);
    setShowForm(false);
    start(async () => {
      const r = await valuationAction({
        city: v.city,
        locality: v.locality,
        propertyType: v.propertyType,
        transactionType: v.transactionType === "rent" ? "rent" : "sale",
        areaValue: Number(v.areaValue),
        areaUnit: v.areaUnit,
        areaType: v.areaType || null,
        userRatePerSqft: v.userRate ? Number(v.userRate.replace(/,/g, "")) : null,
      });
      setResult(r);
    });
  }

  const cls = "field";
  const snapshot =
    result && result.ok && result.low && result.high ? JSON.stringify({ low: result.low, high: result.high, basis: result.basis }) : undefined;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
      <form onSubmit={submit} className="space-y-4 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8" aria-describedby="valuation-note">
        <h2 className="font-display text-3xl text-navy">Your property</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Estimate</span>
            <select name="transactionType" className={cls} defaultValue="sale">
              <option value="sale">Sale value</option>
              <option value="rent">Monthly rent</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label">Property type *</span>
            <select name="propertyType" className={cls} required defaultValue="apartment">
              {Object.entries(PROPERTY_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">City *</span>
            <input name="city" className={cls} required maxLength={80} autoComplete="address-level2" />
          </label>
          <label className="block">
            <span className="field-label">Locality</span>
            <input name="locality" className={cls} maxLength={100} />
          </label>
          <label className="block">
            <span className="field-label">Area *</span>
            <input name="areaValue" className={cls} required inputMode="decimal" pattern="[0-9]+(\.[0-9]+)?" maxLength={12} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="field-label">Unit</span>
              <select name="areaUnit" className={cls} defaultValue="sqft">
                {Object.entries(AREA_UNITS).map(([k, u]) => (
                  <option key={k} value={k}>{u.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Area type</span>
              <select name="areaType" className={cls} defaultValue="">
                <option value="">Any</option>
                {Object.entries(AREA_TYPES).map(([k, a]) => (
                  <option key={k} value={k}>{a.replace(" area", "")}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block sm:col-span-2">
            <span className="field-label">Your reference rate, ₹ per sq ft (optional)</span>
            <input name="userRate" className={cls} inputMode="numeric" maxLength={12} placeholder="Only used if we lack local data" />
            <span className="field-hint">For example, the rate in a recent sale deed in your building. Used only for an illustrative calculation.</span>
          </label>
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Calculating…" : "Calculate estimate"}
        </button>
        <p id="valuation-note" className="text-xs leading-relaxed text-muted">
          This calculator never invents market data. It uses verified comparable sales recorded by our team where at least three exist,
          otherwise asking prices of listings on this website (clearly labelled), otherwise only the rate you enter.
        </p>
      </form>

      <div aria-live="polite">
        {!result ? (
          <div className="flex h-full min-h-72 flex-col justify-center border border-dashed border-stone-400 p-8 text-center text-muted">
            <p className="font-display text-3xl text-navy">Your estimate will appear here</p>
            <p className="mt-2 text-sm">Enter the details on the left and press Calculate.</p>
          </div>
        ) : !result.ok ? (
          <div role="alert" className="border-l-4 border-danger bg-danger-50 p-5 text-sm text-danger">{result.error}</div>
        ) : (
          <div className="bg-navy p-7 text-white sm:p-9">
            <span className={`badge ${METHOD_LABEL[result.method].tone}`}>{METHOD_LABEL[result.method].badge}</span>
            {result.low !== null && result.high !== null ? (
              <>
                <p className="mt-5 text-sm text-white/70">
                  Estimated {result.transactionType === "rent" ? "monthly rent" : "value"} for {Math.round(result.areaSqft).toLocaleString("en-IN")} sq ft
                </p>
                <p className="mt-1 font-display text-5xl leading-tight sm:text-6xl">
                  {result.low === result.high
                    ? formatInrCompact(result.low)
                    : `${formatInrCompact(result.low)} – ${formatInrCompact(result.high)}`}
                </p>
                {result.rate ? (
                  <p className="mt-2 text-sm text-white/70">
                    {result.low === result.high
                      ? `${formatInrFull(result.rate.mid)} per sq ft × ${Math.round(result.areaSqft).toLocaleString("en-IN")} sq ft`
                      : `Median ${formatInrFull(result.rate.mid)} per sq ft (range ${formatInrFull(result.rate.low)}–${formatInrFull(result.rate.high)})`}
                    {result.transactionType === "rent" ? " per month" : ""}
                  </p>
                ) : null}
                <p className="mt-4 text-sm text-white/85">Based on {result.basis}.</p>
              </>
            ) : (
              <p className="mt-5 font-display text-3xl">We can&apos;t estimate this one yet</p>
            )}
            <p className="mt-4 flex gap-2 border-t border-white/15 pt-4 text-xs leading-relaxed text-white/70">
              <IconInfo size={16} className="mt-0.5 shrink-0" />
              <span>
                {result.explanation} It is not a formal valuation, not a guarantee of price, and should not be relied on for lending, legal or
                tax purposes.
              </span>
            </p>
            <button type="button" className="btn btn-ghost-light mt-6" onClick={() => setShowForm(true)}>
              Request a professional valuation
            </button>
          </div>
        )}
        {showForm ? (
          <div className="mt-6 bg-white p-6 shadow-[var(--shadow-lift)] sm:p-8">
            <h3 className="mb-5 font-display text-3xl text-navy">Request a professional valuation</h3>
            <SellerForm
              defaults={{
                enquiryType: "valuation",
                city: inputs.city,
                locality: inputs.locality,
                propertyType: inputs.propertyType,
                areaValue: inputs.areaValue,
                areaUnit: inputs.areaUnit,
                areaType: inputs.areaType,
              }}
              valuationSnapshot={snapshot}
            >
              {spamFields}
            </SellerForm>
          </div>
        ) : null}
      </div>
    </div>
  );
}
