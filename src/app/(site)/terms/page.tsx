import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentPageView, ContentSkeleton } from "@/components/site/ContentPageView";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that govern use of the Shree Krishna Associate website.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <ContentPageView slug="terms" eyebrow="Legal" />
    </Suspense>
  );
}
