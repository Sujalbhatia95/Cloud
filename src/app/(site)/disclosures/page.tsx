import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentPageView, ContentSkeleton } from "@/components/site/ContentPageView";

export const metadata: Metadata = {
  title: "Disclosures",
  description: "Brokerage, RERA, listing accuracy, price and availability disclosures for Shree Krishna Associate.",
  alternates: { canonical: "/disclosures" },
};

export default function Page() {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <ContentPageView slug="disclosures" eyebrow="Regulatory" />
    </Suspense>
  );
}
