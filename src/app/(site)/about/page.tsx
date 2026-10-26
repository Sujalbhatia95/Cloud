import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ContentPageView, ContentSkeleton } from "@/components/site/ContentPageView";

export const metadata: Metadata = {
  title: "About us",
  description: "Shree Krishna Associate — residential, rental and commercial property services.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy-900">
        <Image src="/demo/apartment-3.jpg" alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-50" />
        <div className="container-page py-24 text-white lg:py-32">
          <p className="eyebrow !text-gold-100">About Shree Krishna Associate</p>
          <h1 className="mt-4 max-w-3xl text-5xl sm:text-6xl">Property advice grounded in care and honesty</h1>
        </div>
      </section>
      <Suspense fallback={<ContentSkeleton />}>
        <ContentPageView slug="about" eyebrow="Our story" />
      </Suspense>
      <section className="container-page pb-24">
        <div className="flex flex-col items-start gap-5 border-t border-stone pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-3xl text-navy">Ready to talk about your next move?</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="btn btn-primary">Contact us</Link>
            <Link href="/sell" className="btn btn-outline">List your property</Link>
          </div>
        </div>
      </section>
    </>
  );
}
