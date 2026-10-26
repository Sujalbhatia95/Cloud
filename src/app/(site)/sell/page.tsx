import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { SellerForm } from "@/components/forms/SellerForm";
import { SpamFields } from "@/components/forms/SpamFields";
import { IconCheck } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Sell or let your property",
  description: "Tell Shree Krishna Associate about your property to sell, rent out or get a professional valuation.",
  alternates: { canonical: "/sell" },
};

export default function SellPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy-900">
        <Image src="/demo/villa-1.jpg" alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-45" />
        <div className="container-page py-20 text-white lg:py-28">
          <p className="eyebrow !text-gold-100">For owners</p>
          <h1 className="mt-4 max-w-3xl text-5xl sm:text-6xl">Sell or let your property with confidence</h1>
          <p className="mt-4 max-w-xl text-white/85">
            Share a few details and our team will contact you to discuss pricing, presentation and next steps. There is no obligation.
          </p>
        </div>
      </section>
      <div className="container-page grid gap-14 py-14 lg:grid-cols-[1.5fr_1fr] lg:py-20">
        <div className="bg-white p-6 shadow-[var(--shadow-lift)] sm:p-9">
          <h2 className="mb-6 font-display text-3xl text-navy">Tell us about your property</h2>
          <Suspense fallback={<div className="skeleton h-[900px]" />}>
            <SellerForm>
              <SpamFields form="seller" />
            </SellerForm>
          </Suspense>
        </div>
        <aside className="space-y-10">
          <div>
            <p className="eyebrow">What happens next</p>
            <ol className="mt-5 space-y-5 text-sm">
              {[
                ["We call you", "A member of our team contacts you using your preferred method."],
                ["Visit & advice", "We visit (with your permission) and discuss price, documents and presentation."],
                ["Written terms", "Brokerage and service terms are agreed in writing before marketing starts."],
                ["Marketing", "Your listing goes live with screened enquiries and accompanied viewings."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy font-display text-white">{i + 1}</span>
                  <span>
                    <span className="block font-semibold text-ink">{t}</span>
                    <span className="text-muted">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="border border-stone bg-white p-6">
            <p className="font-display text-2xl text-navy">Documents you may need later</p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {["Title / sale deed and chain documents", "Approved plan, occupancy / completion certificate (where applicable)", "Society NOC and latest maintenance receipts", "Property tax receipts", "RERA registration details for new projects"].map((d) => (
                <li key={d} className="flex gap-2">
                  <IconCheck size={16} className="mt-0.5 shrink-0 text-peacock" /> {d}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">Please don&apos;t upload documents through the website — we will ask for them securely when needed.</p>
          </div>
          <div className="bg-sand p-6">
            <p className="font-display text-2xl text-navy">Curious about value?</p>
            <p className="mt-2 text-sm text-muted">Try our estimate calculator — it tells you exactly what data it is based on.</p>
            <Link href="/valuation" className="btn btn-outline btn-sm mt-4">Open the calculator</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
