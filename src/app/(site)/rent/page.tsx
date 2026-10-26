import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults, SearchSkeleton } from "@/components/search/SearchPage";

export const metadata: Metadata = {
  title: "Property for rent",
  description: "Furnished and unfurnished homes and spaces to rent, with monthly rents shown upfront.",
  alternates: { canonical: "/rent" },
};

export default function Page({ searchParams }: PageProps<"/rent">) {
  return (
    <>
      <header className="container-page pb-8 pt-12 lg:pt-16">
        <p className="eyebrow">Search</p>
        <span className="hairline mt-3" />
        <h1 className="mt-4 text-5xl text-navy sm:text-6xl">Homes for rent</h1>
        <p className="mt-3 max-w-2xl text-muted">Furnished and unfurnished homes and spaces to rent, with monthly rents shown upfront.</p>
      </header>
      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults basePath="/rent" preset={{ deal: "rent" }} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
