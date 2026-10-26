import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { SellerForm } from "@/components/forms/SellerForm";
import { SpamFields } from "@/components/forms/SpamFields";
import { PropertyCard, PropertyGridSkeleton } from "@/components/property/PropertyCard";
import { PropertyImage } from "@/components/property/PropertyImage";
import { HeroSearch } from "@/components/site/HeroSearch";
import { IconArrowRight } from "@/components/ui/icons";
import type { Listing } from "@/db/schema";
import { formatPrice, listingSpecsLine, propertyTypeLabel } from "@/lib/listings/format";
import { getCityStats, getFeaturedListings, getLocalityStats, getLocationSuggestions, getRecentListings } from "@/lib/listings/queries";
import { listingPath } from "@/lib/listings/slug";
import { getSettings } from "@/lib/settings";

/*
 * Laid out like a property magazine: a cover photograph, a short statement of the practice,
 * "The Collection" of featured listings as a spread, a typographic index of cities, then
 * recent listings, how we work and the owner enquiry.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Practice />
      <section className="container-page py-20 lg:py-32" aria-labelledby="featured-heading">
        <SectionHeading id="featured-heading" eyebrow="Featured properties" title="The Collection" href="/buy" linkLabel="All properties for sale" />
        <Suspense fallback={<PropertyGridSkeleton count={3} />}>
          <Featured />
        </Suspense>
      </section>
      <section className="bg-navy-900 py-20 text-white lg:py-32" aria-labelledby="locations-heading">
        <div className="container-page">
          <SectionHeading id="locations-heading" eyebrow="Neighbourhoods" title="Where we work" dark />
          <Suspense fallback={<div className="space-y-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse bg-white/5" />)}</div>}>
            <Locations />
          </Suspense>
        </div>
      </section>
      <section className="container-page py-20 lg:py-32" aria-labelledby="recent-heading">
        <SectionHeading id="recent-heading" eyebrow="Just listed" title="Recently added" href="/rent" linkLabel="Browse rentals" />
        <Suspense fallback={<PropertyGridSkeleton count={4} />}>
          <Recent />
        </Suspense>
      </section>
      <Principles />
      <SellerSection />
      <ClosingCta />
    </>
  );
}

function Hero() {
  return (
    <section className="under-header relative isolate flex min-h-[640px] items-end overflow-hidden bg-[linear-gradient(to_bottom,var(--color-sand)_0%,var(--color-sand)_18%,var(--color-navy-900)_55%)] lg:min-h-[min(94svh,900px)]">
      <Image
        src="/demo/hero.jpg"
        alt="Modern house with a garden and swimming pool on a sunny day (stock photograph)"
        fill
        priority
        sizes="100vw"
        quality={85}
        className="-z-10 object-cover object-center"
      />
      {/* Darkens only the lower part for the headline; the top stays clear so the logo sits on the photo itself.
          The section's own colours (light top, navy below) keep the menu and headline readable if the photo fails to load. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/90 from-5% via-navy-900/60 via-55% to-transparent to-85%" aria-hidden />
      <div className="container-page w-full pb-12 pt-32 lg:pb-16">
        <div className="max-w-4xl animate-fade-up [text-shadow:0_1px_14px_rgb(7_15_51/0.45)]">
          <p className="flex items-center gap-4 text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-gold-100">
            <span className="h-px w-10 bg-gold" aria-hidden />
            Residential &amp; commercial property
          </p>
          <h1 className="mt-6 text-[3.1rem] font-light leading-[0.98] tracking-[-0.02em] text-balance text-white sm:text-7xl lg:text-[6.4rem]">
            Exceptional homes, <em className="font-normal italic text-gold-100">chosen with devotion.</em>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            Buy, rent or sell residential and commercial property with a dedicated local team, from the first viewing to the final handover.
          </p>
        </div>
        <div className="mt-10 animate-fade-up [animation-delay:150ms] lg:mt-14">
          <HeroSearch datalistId="location-suggestions" />
          <Suspense fallback={null}>
            <LocationDatalist id="location-suggestions" />
          </Suspense>
        </div>
      </div>
      <p className="absolute bottom-3 right-4 hidden text-[0.65rem] uppercase tracking-[0.18em] text-white/55 sm:block">Stock photograph, for illustration</p>
    </section>
  );
}

async function LocationDatalist({ id }: { id: string }) {
  const s = await getSettings();
  const { cities, localities } = await getLocationSuggestions(s.demoMode);
  return (
    <datalist id={id}>
      {cities.map((c) => (
        <option key={`c-${c}`} value={c} />
      ))}
      {localities.map((l) => (
        <option key={`l-${l}`} value={l.split(",")[0]} label={l} />
      ))}
    </datalist>
  );
}

function Practice() {
  const services = [
    { href: "/buy", title: "Buy", text: "Apartments, villas, plots and independent homes." },
    { href: "/rent", title: "Rent", text: "Furnished and unfurnished homes on clear terms." },
    { href: "/commercial", title: "Commercial", text: "Offices, shops, showrooms and warehouses." },
    { href: "/sell", title: "Sell or let", text: "Pricing advice, careful marketing and screened enquiries." },
  ];
  return (
    <section aria-labelledby="practice-heading" className="bg-ivory">
      <div className="container-page grid gap-10 pb-6 pt-20 lg:grid-cols-[13rem_1fr] lg:gap-16 lg:pb-10 lg:pt-28">
        <div data-reveal>
          <p className="eyebrow">The practice</p>
          <span className="hairline mt-3" />
        </div>
        <div>
          <h2 id="practice-heading" className="max-w-4xl text-[2rem] font-light leading-[1.18] text-balance text-navy sm:text-[2.7rem] lg:text-[3.3rem]" data-reveal>
            A property practice for people who care where they live and work. We list homes and commercial spaces we have checked with
            their owners, and we set out our <em className="italic text-gold-700">terms in writing</em> before you commit.
          </h2>
          <ul className="mt-14 grid border-t border-stone sm:grid-cols-2 lg:grid-cols-4">
            {services.map(({ href, title, text }, i) => (
              <li
                key={href}
                className="border-b border-stone sm:[&:nth-child(even)]:pl-6 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:pr-6 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}
              >
                <Link href={href} className="group flex h-full flex-col gap-2 py-7">
                  <span className="flex items-center justify-between font-display text-[1.9rem] leading-none text-navy">
                    {title}
                    <IconArrowRight size={18} className="text-gold transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                  <span className="text-sm leading-relaxed text-muted">{text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  href,
  linkLabel,
  dark = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
  dark?: boolean;
}) {
  return (
    <div className="mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between lg:mb-16" data-reveal>
      <div>
        <p className={`eyebrow ${dark ? "!text-gold" : ""}`}>{eyebrow}</p>
        <span className="hairline mt-3" />
        <h2 id={id} className={`mt-5 text-5xl font-light tracking-[-0.015em] sm:text-6xl lg:text-7xl ${dark ? "text-white" : "text-navy"}`}>
          {title}
        </h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="group inline-flex items-center gap-2 self-start border-b border-navy/25 pb-1 text-sm font-semibold text-navy transition-colors hover:border-royal hover:text-royal sm:self-auto"
        >
          {linkLabel}
          <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      ) : null}
    </div>
  );
}

type FeaturedListing = Awaited<ReturnType<typeof getFeaturedListings>>[number];

function ListingBadges({ l }: { l: Pick<Listing, "isDemo" | "transactionType"> }) {
  return (
    <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
      {l.isDemo ? <span className="badge badge-demo">Demo listing</span> : null}
      <span className="badge badge-dark">{l.transactionType === "rent" ? "For rent" : "For sale"}</span>
    </div>
  );
}

function FeatureImage({ l, aspect, sizes }: { l: FeaturedListing; aspect: string; sizes: string }) {
  return (
    <div className={`img-zoom relative overflow-hidden bg-sand ${aspect}`}>
      <PropertyImage src={l.imageUrls[0]} alt={`${l.title}${l.isDemo ? " (demo listing, stock photograph)" : ""}`} sizes={sizes} />
      <ListingBadges l={l} />
    </div>
  );
}

function FeatureCaption({ l, large = false }: { l: FeaturedListing; large?: boolean }) {
  const specs = listingSpecsLine(l);
  return (
    <>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-gold-700">
        <span>
          {l.locality}, {l.city}
        </span>
        <span className="h-px w-6 bg-gold/50" aria-hidden />
        <span>{propertyTypeLabel(l.propertyType)}</span>
      </p>
      <h3 className={`mt-3 font-normal leading-[1.08] text-balance text-navy ${large ? "text-4xl sm:text-5xl" : "text-[1.75rem] sm:text-3xl"}`}>
        <Link href={listingPath(l)} className="after:absolute after:inset-0 focus-visible:outline-none">
          {l.title}
        </Link>
      </h3>
      <p className={`mt-4 font-display text-navy ${large ? "text-3xl" : "text-2xl"}`}>{formatPrice(l)}</p>
      {specs.length ? <p className="mt-2 text-sm text-muted">{specs.join(" · ")}</p> : null}
    </>
  );
}

async function Featured() {
  const s = await getSettings();
  const items = await getFeaturedListings(s.demoMode, 5);
  if (items.length === 0) return <EmptyNote text="Featured properties will appear here once listings are marked as featured." />;
  const [lead, second, third] = items;
  return (
    <div className="space-y-20 lg:space-y-28">
      <article className="group relative grid items-center gap-8 lg:grid-cols-12 lg:gap-12" data-reveal>
        <div className="lg:col-span-8">
          <FeatureImage l={lead} aspect="aspect-[4/3] lg:aspect-[16/11]" sizes="(min-width: 1024px) 66vw, 100vw" />
        </div>
        <div className="lg:col-span-4">
          <FeatureCaption l={lead} large />
          <span className="mt-8 inline-flex items-center gap-2 border-b border-navy/25 pb-1 text-sm font-semibold text-navy transition-colors group-hover:border-royal group-hover:text-royal">
            View the property <IconArrowRight size={16} />
          </span>
        </div>
      </article>
      {second ? (
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-12">
          <article className="group relative lg:col-span-5" data-reveal>
            <FeatureImage l={second} aspect="aspect-[4/5]" sizes="(min-width: 1024px) 40vw, 100vw" />
            <div className="mt-6">
              <FeatureCaption l={second} />
            </div>
          </article>
          {third ? (
            <article className="group relative lg:col-span-6 lg:col-start-7 lg:mt-40" data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
              <FeatureImage l={third} aspect="aspect-[4/3]" sizes="(min-width: 1024px) 48vw, 100vw" />
              <div className="mt-6">
                <FeatureCaption l={third} />
              </div>
            </article>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

async function Locations() {
  const s = await getSettings();
  const [cities, localities] = await Promise.all([getCityStats(s.demoMode, 8), getLocalityStats(s.demoMode, 14)]);
  if (cities.length === 0) return <EmptyNote text="Locations will appear here as soon as listings are published." dark />;
  return (
    <>
      <ul className="border-t border-white/15">
        {cities.map((c, i) => {
          const count = `${c.count} ${c.count === 1 ? "property" : "properties"}`;
          return (
            <li key={c.city} className="border-b border-white/15" data-reveal style={{ ["--reveal-delay" as string]: `${i * 50}ms` }}>
              <Link
                href={`/buy?city=${encodeURIComponent(c.city)}`}
                className="group grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 py-5 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:gap-8 sm:py-6"
              >
                <span className="img-zoom relative block aspect-[4/3] overflow-hidden bg-navy">
                  <PropertyImage src={c.image} alt="" sizes="112px" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-[2.1rem] font-light leading-none transition-colors group-hover:text-gold-100 sm:text-6xl">
                    {c.city}
                  </span>
                  <span className="mt-2 block text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/60 sm:hidden">{count}</span>
                </span>
                <span className="flex items-center gap-6">
                  <span className="hidden text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/60 sm:block">
                    {c.state}
                    <span className="mx-3 text-gold" aria-hidden>
                      ·
                    </span>
                    {count}
                  </span>
                  <IconArrowRight size={22} className="text-gold transition-transform duration-300 group-hover:translate-x-1.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {localities.length > 0 ? (
        <div className="mt-12" data-reveal>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/60">Popular localities</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {localities.map((l) => (
              <li key={`${l.locality}-${l.city}`}>
                <Link
                  href={`/buy?locality=${encodeURIComponent(l.locality)}&city=${encodeURIComponent(l.city)}`}
                  className="inline-flex items-center gap-1.5 border border-white/20 px-3.5 py-1.5 text-sm text-white/90 transition-colors hover:border-gold hover:text-gold-100"
                >
                  {l.locality}, {l.city} <span className="text-xs text-white/60">({l.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

async function Recent() {
  const s = await getSettings();
  const items = await getRecentListings(s.demoMode, 8);
  if (items.length === 0) return <EmptyNote text="New listings will appear here." />;
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {items.map((l, i) => (
        <li key={l.id} className="w-[82%] shrink-0 snap-start sm:w-auto" data-reveal style={{ ["--reveal-delay" as string]: `${(i % 4) * 80}ms` }}>
          <PropertyCard listing={l} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 82vw" />
        </li>
      ))}
    </ul>
  );
}

function Principles() {
  const items = [
    ["Clear brokerage terms", "Our fees are disclosed in writing before you commit. See our Disclosures page."],
    ["Listings checked first", "Each listing is checked with the owner for availability and key details before it goes live."],
    ["RERA-conscious", "Where a project must be registered, we show its RERA registration number exactly as issued."],
    ["Your data, respected", "We use your details only to respond to you, and you can ask us to delete them at any time."],
  ];
  return (
    <section className="border-y border-stone bg-sand" aria-labelledby="principles-heading">
      <div className="container-page grid gap-12 py-20 lg:grid-cols-[1fr_1.35fr] lg:gap-20 lg:py-28">
        <div data-reveal>
          <p className="eyebrow">How we work</p>
          <span className="hairline mt-3" />
          <h2 id="principles-heading" className="mt-5 text-4xl font-light text-balance text-navy sm:text-5xl lg:text-[3.6rem]">
            Straightforward, from first visit to <em className="italic text-gold-700">final handover</em>
          </h2>
        </div>
        <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {items.map(([t, d], i) => (
            <div key={t} className="border-t border-gold/40 pt-6" data-reveal style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}>
              <dt className="font-display text-[1.7rem] leading-tight text-navy">{t}</dt>
              <dd className="mt-3 text-sm leading-relaxed text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function SellerSection() {
  return (
    <section className="bg-navy text-white" aria-labelledby="seller-heading">
      <div className="container-page grid gap-12 py-20 lg:grid-cols-2 lg:gap-20 lg:py-32">
        <div data-reveal>
          <p className="eyebrow !text-gold">For owners</p>
          <span className="hairline mt-3" />
          <h2 id="seller-heading" className="mt-5 text-4xl font-light text-balance sm:text-5xl lg:text-[3.6rem]">
            Thinking of selling or letting your property?
          </h2>
          <p className="mt-6 max-w-lg leading-relaxed text-white/75">
            Tell us about your property and we will call you to discuss pricing, presentation and the right buyers or tenants. Our brokerage
            terms are explained in writing before you commit.
          </p>
          <ol className="mt-10 space-y-6 border-l border-gold/40 pl-6">
            {[
              ["Share the basics", "Location, type and your expectations. It takes two minutes."],
              ["We visit and advise", "An honest view on pricing, documents and presentation."],
              ["We market with care", "Professional listing, screened enquiries and accompanied viewings."],
            ].map(([t, d], i) => (
              <li key={t}>
                <span className="font-display text-xl italic text-gold">Step {i + 1}</span>
                <span className="mt-1 block font-semibold">{t}</span>
                <span className="text-sm text-white/70">{d}</span>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/sell" className="btn btn-ghost-light">
              Full seller form
            </Link>
            <Link href="/valuation" className="btn btn-ghost-light">
              Get a property estimate
            </Link>
          </div>
        </div>
        <div className="self-start bg-white p-6 text-ink shadow-[var(--shadow-lift)] sm:p-10" data-reveal>
          <h3 className="font-display text-3xl text-navy">Request a callback</h3>
          <p className="mb-6 mt-1 text-sm text-muted">Leave your details and our team will get in touch.</p>
          <Suspense fallback={<div className="skeleton h-96" />}>
            <SellerForm compact>
              <SpamFields form="seller" />
            </SellerForm>
          </Suspense>
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="relative isolate overflow-hidden bg-navy-900">
      <Image src="/demo/closing.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-900/80 via-navy-900/55 to-navy-900/80" aria-hidden />
      <div className="container-page flex flex-col items-center py-24 text-center text-white lg:py-36">
        <p className="eyebrow !text-gold-100" data-reveal>
          Begin the search
        </p>
        <h2 className="mt-5 max-w-3xl text-5xl font-light text-balance sm:text-6xl lg:text-7xl" data-reveal>
          Let&apos;s find your <em className="italic text-gold-100">next address.</em>
        </h2>
        <p className="mt-5 max-w-lg text-white/80" data-reveal>
          Tell us what you are looking for and we will shortlist properties that fit.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3" data-reveal>
          <Link href="/contact" className="btn btn-primary">
            Talk to our team
          </Link>
          <Link href="/buy" className="btn btn-ghost-light">
            Start searching
          </Link>
        </div>
      </div>
    </section>
  );
}

function EmptyNote({ text, dark = false }: { text: string; dark?: boolean }) {
  return (
    <p className={`border border-dashed p-8 text-center text-sm ${dark ? "border-white/25 text-white/70" : "border-stone-400 bg-white/60 text-muted"}`}>{text}</p>
  );
}
