import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { HeaderMode } from "./HeaderMode";
import { MobileMenu } from "./MobileMenu";
import { NavLinks, NAV_ITEMS, StaticNavLinks } from "./NavLinks";

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-40 border-b border-stone/80 bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/85">
      <Suspense fallback={null}>
        <HeaderMode />
      </Suspense>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="container-page flex h-[68px] items-center justify-between gap-6 lg:h-[78px]">
        <Link href="/" className="shrink-0" aria-label="Shree Krishna Associate — home">
          <Image
            src="/brand/logo-transparent.png"
            alt="Shree Krishna Associate"
            width={875}
            height={565}
            priority
            sizes="96px"
            className="h-[50px] w-auto lg:h-[60px]"
          />
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <Suspense fallback={<StaticNavLinks />}>
            <NavLinks />
          </Suspense>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/sell" className="btn btn-dark btn-sm hidden sm:inline-flex">
            List your property
          </Link>
          <MobileMenu items={NAV_ITEMS} />
        </div>
      </div>
    </header>
  );
}
