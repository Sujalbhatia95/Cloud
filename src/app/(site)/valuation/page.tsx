import type { Metadata } from "next";
import { Suspense } from "react";
import { SpamFields } from "@/components/forms/SpamFields";
import { ValuationCalculator } from "@/components/forms/ValuationCalculator";

export const metadata: Metadata = {
  title: "Property estimate calculator",
  description:
    "A transparent property estimate: verified comparable sales where available, otherwise clearly labelled illustrative figures. Not a formal valuation.",
  alternates: { canonical: "/valuation" },
};

export default function ValuationPage() {
  return (
    <div className="container-page py-14 lg:py-20">
      <p className="eyebrow">Property estimate</p>
      <span className="hairline mt-3" />
      <h1 className="mt-4 max-w-3xl text-5xl text-navy sm:text-6xl">What could your property be worth?</h1>
      <p className="mt-4 max-w-2xl text-muted">
        A quick, honest starting point. Every result tells you exactly which data it uses — and when we don&apos;t have enough data, we say
        so instead of guessing.
      </p>
      <div className="mt-12">
        <Suspense fallback={<div className="skeleton h-[560px]" />}>
          <ValuationCalculator spamFields={<SpamFields form="seller" />} />
        </Suspense>
      </div>
    </div>
  );
}
