import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults, SearchSkeleton } from "@/components/search/SearchPage";

export const metadata: Metadata = {
  title: "Property for sale",
  description: "Apartments, villas, independent houses, plots and more — filtered by location, budget, size and availability.",
  alternates: { canonical: "/buy" },
};

export default function Page({ searchParams }: PageProps<"/buy">) {
  return (
    <>
      <header className="container-page pb-8 pt-12 lg:pt-16">
        <p className="eyebrow">Search</p>
        <span className="hairline mt-3" />
        <h1 className="mt-4 text-5xl text-navy sm:text-6xl">Property for sale</h1>
        <p className="mt-3 max-w-2xl text-muted">Apartments, villas, independent houses, plots and more — filtered by location, budget, size and availability.</p>
      </header>
      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults basePath="/buy" preset={{ deal: "sale" }} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
