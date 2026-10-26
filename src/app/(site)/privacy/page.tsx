import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentPageView, ContentSkeleton } from "@/components/site/ContentPageView";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "How Shree Krishna Associate collects, uses and protects personal data submitted through this website.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <ContentPageView slug="privacy" eyebrow="Legal" />
    </Suspense>
  );
}
