import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { SellerForm } from "@/components/forms/SellerForm";
import { SpamFields } from "@/components/forms/SpamFields";
import { PropertyCard, PropertyGridSkeleton } from "@/components/property/PropertyCard";
import { PropertyImage } from "@/components/property/PropertyImage";
import { HeroSearch } from "@/components/site/HeroSearch";
import { IconArrowRight, IconBuilding, IconChart, IconHome, IconKey } from "@/components/ui/icons";
import { formatPrice, listingSpecsLine } from "@/lib/listings/format";
import { getCityStats, getFeaturedListings, getLocalityStats, getLocationSuggestions, getRecentListings } from "@/lib/listings/queries";
import { listingPath } from "@/lib/listings/slug";
import { getSettings } from "@/lib/settings";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Services />
      <section className="container-page py-20 lg:py-28" aria-labelledby="featured-heading">
        <SectionHeading id="featured-heading" eyebrow="Featured" title="Properties we're proud to present" href="/buy" linkLabel="All properties for sale" />
        <Suspense fallback={<PropertyGridSkeleton count={3} />}>
          <Featured />
        </Suspense>
      </section>
      <section className="bg-sand py-20 lg:py-28" aria-labelledby="locations-heading">
        <div className="container-page">
          <SectionHeading id="locations-heading" eyebrow="Explore by location" title="Find your neighbourhood" />
          <Suspense fallback={<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton aspect-[4/5]" />)}</div>}>
            <Locations />
          </Suspense>
        </div>
      </section>
      <section className="container-page py-20 lg:py-28" aria-labelledby="recent-heading">
        <SectionHeading id="recent-heading" eyebrow="Just listed" title="Recently added" href="/rent" linkLabel="Browse rentals" />
        <Suspense fallback={<PropertyGridSkeleton count={4} />}>
          <Recent />
        </Suspense>
      </section>
      <SellerSection />
      <Principles />
      <ClosingCta />
    </>
  );
}

function Hero() {
  return (
    <section className="relative isolate flex min-h-[640px] items-end overflow-hidden bg-navy-900 lg:min-h-[760px]">
      <Image
        src="/demo/hero.jpg"
        alt="Contemporary villa with a pool at dusk (computer-generated illustration)"
        fill
        priority
        sizes="100vw"
        quality={85}
        className="-z-10 object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/90 via-navy-900/35 to-navy-900/20" aria-hidden />
      <div className="container-page w-full pb-14 pt-28 lg:pb-20">
        <div className="max-w-3xl animate-fade-up">
          <p className="eyebrow !text-gold-100">Shree Krishna Associate</p>
          <h1 className="mt-4 text-[2.9rem] leading-[1.02] text-white sm:text-6xl lg:text-[5.25rem]">
            Homes chosen with <em className="font-display italic text-gold-100">devotion</em> to detail
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            Buy, rent or sell residential and commercial property with a dedicated local team — from the first search to the final handover.
          </p>
        </div>
        <div className="mt-10 animate-fade-up [animation-delay:150ms]">
          <HeroSearch datalistId="location-suggestions" />
          <Suspense fallback={null}>
            <LocationDatalist id="location-suggestions" />
          </Suspense>
        </div>
      </div>
      <p className="absolute bottom-2 right-3 text-[0.65rem] text-white/50">Illustrative CGI image</p>
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

function Services() {
  const items = [
    { href: "/buy", icon: IconHome, title: "Buy", text: "Apartments, villas, plots and independent homes." },
    { href: "/rent", icon: IconKey, title: "Rent", text: "Furnished and unfurnished homes on clear terms." },
    { href: "/commercial", icon: IconBuilding, title: "Commercial", text: "Offices, shops, showrooms and warehouses." },
    { href: "/valuation", icon: IconChart, title: "Estimate", text: "An honest, clearly-labelled price estimate." },
  ];
  return (
    <section aria-label="Services" className="border-b border-stone bg-white">
      <div className="container-page grid grid-cols-2 lg:grid-cols-4">
        {items.map(({ href, icon: Icon, title, text }, i) => (
          <Link
            key={href}
            href={href}
            className={`group flex flex-col gap-3 border-stone py-8 pr-4 transition-colors hover:bg-ivory sm:flex-row sm:items-start sm:gap-4 sm:px-6 ${
              i % 2 === 1 ? "border-l pl-4" : ""
            } ${i >= 2 ? "border-t lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
            data-reveal
            style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}
          >
            <Icon size={26} className="shrink-0 text-gold" />
            <span>
              <span className="flex items-center gap-2 font-display text-2xl text-navy">
                {title}
                <IconArrowRight size={16} className="opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">{text}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SectionHeading({ id, eyebrow, title, href, linkLabel }: { id: string; eyebrow: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" data-reveal>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <span className="hairline mt-3" />
        <h2 id={id} className="mt-4 text-4xl text-navy sm:text-5xl">
          {title}
        </h2>
      </div>
      {href ? (
        <Link href={href} className="group inline-flex items-center gap-2 text-sm font-semibold text-royal">
          {linkLabel}
          <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      ) : null}
    </div>
  );
}

async function Featured() {
  const s = await getSettings();
  const items = await getFeaturedListings(s.demoMode, 5);
  if (items.length === 0) return <EmptyNote text="Featured properties will appear here once listings are marked as featured." />;
  const [lead, ...rest] = items;
  const specs = listingSpecsLine(lead);
  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:grid-rows-2">
      <article className="group relative min-h-[420px] overflow-hidden bg-navy lg:col-span-2 lg:row-span-2" data-reveal>
        <div className="img-zoom absolute inset-0">
          <PropertyImage src={lead.imageUrls[0]} alt={lead.title} sizes="(min-width: 1024px) 66vw, 100vw" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/20 to-transparent" aria-hidden />
        <div className="absolute left-4 top-4 flex gap-1.5">
          {lead.isDemo ? <span className="badge badge-demo">Demo listing</span> : null}
          <span className="badge badge-dark">{lead.transactionType === "rent" ? "For rent" : "For sale"}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
          <p className="font-display text-4xl sm:text-5xl">{formatPrice(lead)}</p>
          <h3 className="mt-2 max-w-xl text-lg font-semibold sm:text-xl">
            <Link href={listingPath(lead)} className="after:absolute after:inset-0">
              {lead.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-white/80">
            {lead.locality}, {lead.city}
            {specs.length ? ` · ${specs.join(" · ")}` : ""}
          </p>
        </div>
      </article>
      {rest.slice(0, 2).map((l, i) => (
        <div key={l.id} data-reveal style={{ ["--reveal-delay" as string]: `${(i + 1) * 100}ms` }}>
          <PropertyCard listing={l} sizes="(min-width: 1024px) 33vw, 100vw" />
        </div>
      ))}
    </div>
  );
}

async function Locations() {
  const s = await getSettings();
  const [cities, localities] = await Promise.all([getCityStats(s.demoMode, 8), getLocalityStats(s.demoMode, 14)]);
  if (cities.length === 0) return <EmptyNote text="Locations will appear here as soon as listings are published." />;
  return (
    <>
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cities.map((c, i) => (
          <li key={c.city} data-reveal style={{ ["--reveal-delay" as string]: `${i * 70}ms` }}>
            <Link href={`/buy?city=${encodeURIComponent(c.city)}`} className="group relative block aspect-[4/5] overflow-hidden bg-navy">
              <div className="img-zoom absolute inset-0">
                <PropertyImage src={c.image} alt="" sizes="(min-width: 1024px) 25vw, 50vw" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/85 via-navy-900/10 to-transparent" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                <p className="font-display text-3xl leading-none">{c.city}</p>
                <p className="mt-1.5 text-xs uppercase tracking-[0.16em] text-white/75">
                  {c.count} {c.count === 1 ? "property" : "properties"} · {c.state}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {localities.length > 0 ? (
        <div className="mt-10" data-reveal>
          <p className="text-sm font-semibold text-ink">Popular localities</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {localities.map((l) => (
              <li key={`${l.locality}-${l.city}`}>
                <Link
                  href={`/buy?locality=${encodeURIComponent(l.locality)}&city=${encodeURIComponent(l.city)}`}
                  className="inline-flex items-center gap-1.5 border border-stone bg-white px-3 py-1.5 text-sm text-ink transition-colors hover:border-royal hover:text-royal"
                >
                  {l.locality}, {l.city} <span className="text-xs text-muted">({l.count})</span>
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

function SellerSection() {
  return (
    <section className="bg-navy text-white" aria-labelledby="seller-heading">
      <div className="container-page grid gap-12 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <div data-reveal>
          <p className="eyebrow !text-gold">For owners</p>
          <span className="hairline mt-3" />
          <h2 id="seller-heading" className="mt-4 text-4xl sm:text-5xl">
            Thinking of selling or letting your property?
          </h2>
          <p className="mt-5 max-w-lg leading-relaxed text-white/80">
            Tell us about your property and we will call you to discuss pricing, presentation and the right buyers or tenants — with
            our brokerage terms explained in writing before you commit.
          </p>
          <ol className="mt-8 space-y-5">
            {[
              ["Share the basics", "Location, type and your expectations — it takes two minutes."],
              ["We visit and advise", "An honest view on pricing, documents and presentation."],
              ["We market with care", "Professional listing, screened enquiries and accompanied viewings."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/60 font-display text-lg text-gold">{i + 1}</span>
                <span>
                  <span className="block font-semibold">{t}</span>
                  <span className="text-sm text-white/70">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/sell" className="btn btn-ghost-light">Full seller form</Link>
            <Link href="/valuation" className="btn btn-ghost-light">Get a property estimate</Link>
          </div>
        </div>
        <div className="bg-white p-6 text-ink shadow-[var(--shadow-lift)] sm:p-8" data-reveal>
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

function Principles() {
  const items = [
    ["Clear brokerage terms", "Our fees are disclosed in writing before you commit — see our Disclosures page."],
    ["Listings reviewed before publishing", "Each listing is checked with the owner for availability and key details before it goes live."],
    ["RERA-conscious", "Where a project must be registered, we show its RERA registration number exactly as issued."],
    ["Your data, respected", "We use your details only to respond to you, and you can ask us to delete them at any time."],
  ];
  return (
    <section className="container-page py-20 lg:py-28" aria-labelledby="principles-heading">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div data-reveal>
          <p className="eyebrow">How we work</p>
          <span className="hairline mt-3" />
          <h2 id="principles-heading" className="mt-4 text-4xl text-navy sm:text-5xl">
            Straightforward, from first visit to final handover
          </h2>
        </div>
        <dl className="grid gap-8 sm:grid-cols-2">
          {items.map(([t, d], i) => (
            <div key={t} className="border-t border-stone pt-5" data-reveal style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}>
              <dt className="font-display text-2xl text-navy">{t}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="relative isolate overflow-hidden bg-navy-900">
      <Image src="/demo/living-1.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover opacity-35" />
      <div className="container-page flex flex-col items-start gap-6 py-20 text-white sm:flex-row sm:items-center sm:justify-between lg:py-24">
        <div data-reveal>
          <h2 className="text-4xl sm:text-5xl">Let&apos;s find your next address.</h2>
          <p className="mt-3 max-w-lg text-white/80">Tell us what you are looking for and we will shortlist properties that fit.</p>
        </div>
        <div className="flex flex-wrap gap-3" data-reveal>
          <Link href="/contact" className="btn btn-primary">Talk to our team</Link>
          <Link href="/buy" className="btn btn-ghost-light">Start searching</Link>
        </div>
      </div>
    </section>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="border border-dashed border-stone-400 bg-white/60 p-8 text-center text-sm text-muted">{text}</p>;
}
