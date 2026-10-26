import { Suspense } from "react";
import { DemoBanner } from "@/components/site/DemoBanner";
import { SiteFooter, SiteFooterFallback } from "@/components/site/Footer";
import { SiteHeader } from "@/components/site/Header";
import { RevealObserver } from "@/components/site/RevealObserver";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={null}>
        <DemoBanner />
      </Suspense>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Suspense fallback={<SiteFooterFallback />}>
        <SiteFooter />
      </Suspense>
      <RevealObserver />
    </>
  );
}
