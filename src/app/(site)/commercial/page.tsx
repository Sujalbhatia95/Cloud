import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults, SearchSkeleton } from "@/components/search/SearchPage";

export const metadata: Metadata = {
  title: "Commercial property",
  description: "Offices, shops, showrooms, warehouses and industrial space for sale or lease.",
  alternates: { canonical: "/commercial" },
};

export default function Page({ searchParams }: PageProps<"/commercial">) {
  return (
    <>
      <header className="container-page pb-8 pt-12 lg:pt-16">
        <p className="eyebrow">Search</p>
        <span className="hairline mt-3" />
        <h1 className="mt-4 text-5xl text-navy sm:text-6xl">Commercial property</h1>
        <p className="mt-3 max-w-2xl text-muted">Offices, shops, showrooms, warehouses and industrial space for sale or lease.</p>
      </header>
      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults basePath="/commercial" preset={{ category: "commercial" }} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
