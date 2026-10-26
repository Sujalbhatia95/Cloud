import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ShowingForm } from "@/components/forms/ShowingForm";
import { SpamFields } from "@/components/forms/SpamFields";
import { Gallery } from "@/components/property/Gallery";
import { PropertyCard } from "@/components/property/PropertyCard";
import { ShareButtons } from "@/components/property/ShareButton";
import { Placeholder } from "@/components/site/Placeholder";
import { IconAlert, IconArea, IconBath, IconBed, IconCalendar, IconCheck, IconPin } from "@/components/ui/icons";
import type { Listing } from "@/db/schema";
import { env } from "@/lib/env";
import {
  areaTypeLabel,
  formatArea,
  formatDateIST,
  formatInrFull,
  formatPrice,
  furnishingLabel,
  possessionLabel,
  propertyTypeLabel,
  statusLabel,
} from "@/lib/listings/format";
import { getPublicListing, getSimilarListings } from "@/lib/listings/queries";
import { listingPath } from "@/lib/listings/slug";
import { getSettings } from "@/lib/settings";
import { RERA_PLACEHOLDER, placeholder, reraAgentLine, type SiteSettings } from "@/lib/settings-schema";

type Params = { listingId: string; slug?: string[] };

async function load(params: Promise<Params>) {
  const { listingId } = await params;
  const id = decodeURIComponent(listingId).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_.-]{0,63}$/.test(id)) return null;
  const settings = await getSettings();
  const listing = await getPublicListing(id, settings.demoMode);
  return listing ? { listing, settings } : null;
}

export async function generateMetadata({ params }: PageProps<"/property/[listingId]/[[...slug]]">): Promise<Metadata> {
  const data = await load(params);
  if (!data) return { title: "Property not found", robots: { index: false } };
  const l = data.listing;
  const available = l.listingStatus === "active" || l.listingStatus === "under_offer";
  const title = `${l.title} — ${formatPrice(l)} · ${l.locality}, ${l.city}`;
  const description = (l.description ?? `${propertyTypeLabel(l.propertyType)} ${l.transactionType === "rent" ? "for rent" : "for sale"} in ${l.locality}, ${l.city}.`)
    .replace(/\s+/g, " ")
    .slice(0, 158);
  const image = l.imageUrls[0];
  return {
    title,
    description,
    alternates: { canonical: listingPath(l) },
    robots: l.isDemo || !available ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      url: listingPath(l),
      images: image ? [{ url: image.startsWith("/") ? `${env.siteUrl}${image}` : image, alt: l.title }] : undefined,
    },
  };
}

export default function PropertyPage({ params }: PageProps<"/property/[listingId]/[[...slug]]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PropertyDetail params={params} />
    </Suspense>
  );
}

async function PropertyDetail({ params }: { params: Promise<Params> }) {
  const data = await load(params);
  if (!data) notFound();
  const { listing: l, settings } = data;
  const { slug } = await params;
  const canonical = listingPath(l);
  if ((slug?.join("/") ?? "") !== l.slug) redirect(canonical);

  const available = l.listingStatus === "active" || l.listingStatus === "under_offer";
  const url = `${env.siteUrl}${canonical}`;
  const area = formatArea(l);
  const now = new Date();
  const minDate = new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
  const maxDate = new Date(now.getTime() + (330 * 60_000 + 120 * 86_400_000)).toISOString().slice(0, 10);

  return (
    <article className="pb-28 lg:pb-24">
      {!l.isDemo && available ? <JsonLd listing={l} url={url} /> : null}
      <div className="container-page pt-6">
        <nav aria-label="Breadcrumb" className="text-xs text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-ink">Home</Link></li>
            <li aria-hidden>/</li>
            <li>
              <Link href={l.category === "commercial" ? "/commercial" : l.transactionType === "rent" ? "/rent" : "/buy"} className="hover:text-ink">
                {l.category === "commercial" ? "Commercial" : l.transactionType === "rent" ? "Rent" : "Buy"}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href={`/${l.transactionType === "rent" ? "rent" : "buy"}?city=${encodeURIComponent(l.city)}`} className="hover:text-ink">{l.city}</Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">{l.listingId}</li>
          </ol>
        </nav>

        {l.isDemo ? (
          <div role="note" className="mt-4 flex gap-3 border border-amber-300 bg-demo-50 p-4 text-sm text-demo">
            <IconAlert size={20} className="mt-0.5 shrink-0" />
            <p>
              <strong>Demo listing — not a real property.</strong> This sample shows how listings will look. The photos are licensed stock
              photographs, not pictures of this property; the price, location and details are fictional. Showing requests for demo listings are delivered for testing only.
            </p>
          </div>
        ) : null}
        {!available ? (
          <div role="status" className="mt-4 border-l-4 border-gold bg-gold-100 p-4 text-sm text-gold-700">
            <strong>This property is no longer available ({statusLabel(l.listingStatus)}).</strong> It is shown for reference only. See similar
            properties below or <Link href="/contact" className="underline">tell us what you are looking for</Link>.
          </div>
        ) : null}
      </div>

      <div className="container-page mt-5">
        <Gallery images={l.imageUrls} title={l.title} isDemo={l.isDemo} />
      </div>

      <div className="container-page mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {l.isDemo ? <span className="badge badge-demo">Demo listing</span> : null}
            <span className="badge badge-blue">{l.transactionType === "rent" ? "For rent" : "For sale"}</span>
            <span className={`badge ${l.listingStatus === "active" ? "badge-green" : "badge-gold"}`}>{statusLabel(l.listingStatus)}</span>
            <span className="badge badge-muted">{propertyTypeLabel(l.propertyType)}</span>
          </div>
          <h1 className="mt-4 text-4xl text-navy sm:text-5xl">{l.title}</h1>
          <p className="mt-3 flex items-center gap-1.5 text-muted">
            <IconPin size={18} className="text-gold" />
            {l.locality}, {l.city}, {l.state}
            {l.pincode ? ` ${l.pincode}` : ""}
          </p>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-y border-stone py-5">
            <div>
              <p className="font-display text-5xl leading-none text-navy">{formatPrice(l)}</p>
              {l.price ? (
                <p className="mt-2 text-xs text-muted">
                  {formatInrFull(l.price)}
                  {l.transactionType === "rent" ? " per month" : ""}
                  {l.priceNegotiable ? " · negotiable" : ""} · see price disclaimer below
                </p>
              ) : null}
            </div>
            <ShareButtons url={url} title={l.title} />
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {l.bedrooms !== null ? <Fact icon={<IconBed />} label="Bedrooms" value={String(l.bedrooms)} /> : null}
            {l.bathrooms !== null ? <Fact icon={<IconBath />} label="Bathrooms" value={String(l.bathrooms)} /> : null}
            {area ? <Fact icon={<IconArea />} label={areaTypeLabel(l.areaType)} value={area} /> : null}
            <Fact icon={<IconCalendar />} label="Availability" value={availabilityText(l)} />
          </ul>

          <Section title="About this property">
            {l.description ? (
              <div className="space-y-4 leading-relaxed text-ink/90">
                {l.description.split(/\n{2,}/).map((p, i) => (
                  <p key={i} className="whitespace-pre-line">{p}</p>
                ))}
              </div>
            ) : (
              <p className="text-muted">A full description will be added soon. Contact us for details.</p>
            )}
          </Section>

          {l.amenities.length > 0 ? (
            <Section title="Amenities">
              <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {l.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-sm">
                    <IconCheck size={16} className="shrink-0 text-peacock" /> {a}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title="Specifications">
            <dl className="grid border-t border-stone sm:grid-cols-2 sm:gap-x-8">
              {specs(l).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-stone py-3 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="Location">
            <p className="text-sm leading-relaxed">
              {l.locality}, {l.city}, {l.state}
              {l.pincode ? ` — PIN ${l.pincode}` : ""}
            </p>
            <p className="mt-2 text-xs text-muted">The exact address is shared after we confirm your viewing, to protect the owner&apos;s privacy.</p>
            <a
              className="link mt-3 inline-block text-sm"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${l.locality}, ${l.city}, ${l.state}${l.pincode ? ` ${l.pincode}` : ""}`)}`}
            >
              View the area on Google Maps ↗
            </a>
          </Section>

          <Section title="Regulatory information & disclosures">
            <Disclosures listing={l} settings={settings} />
          </Section>
        </div>

        <aside id="schedule" className="scroll-mt-24">
          <div className="lg:sticky lg:top-28">
            <div className="bg-white p-6 shadow-[var(--shadow-lift)] sm:p-7">
              {available ? (
                <>
                  <p className="eyebrow">Visit in person</p>
                  <h2 className="mt-2 font-display text-3xl text-navy">Schedule a showing</h2>
                  <p className="mb-5 mt-1 text-sm text-muted">Choose a preferred time — we will call to confirm.</p>
                  <ShowingForm listingId={l.listingId} title={l.title} minDate={minDate} maxDate={maxDate}>
                    <SpamFields form="showing" />
                  </ShowingForm>
                </>
              ) : (
                <>
                  <h2 className="font-display text-3xl text-navy">No longer available</h2>
                  <p className="mt-2 text-sm text-muted">This property is {statusLabel(l.listingStatus).toLowerCase()}. We can help you find a similar one.</p>
                  <Link href="/contact" className="btn btn-primary mt-5 w-full">Ask about similar properties</Link>
                </>
              )}
            </div>
            <p className="mt-4 text-center text-xs text-muted">
              Listing ID <span className="font-mono text-ink">{l.listingId}</span> · Updated {formatDateIST(l.updatedAt)}
            </p>
          </div>
        </aside>
      </div>

      <Suspense fallback={null}>
        <Similar listing={l} includeDemo={settings.demoMode} />
      </Suspense>

      {available ? (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-stone bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="min-w-0">
            <p className="truncate font-display text-2xl leading-none text-navy">{formatPrice(l)}</p>
            <p className="truncate text-xs text-muted">{l.locality}, {l.city}</p>
          </div>
          <a href="#schedule" className="btn btn-primary btn-sm shrink-0">Schedule a showing</a>
        </div>
      ) : null}
    </article>
  );
}

function availabilityText(l: Listing): string {
  if (l.listingStatus !== "active") return statusLabel(l.listingStatus);
  if (l.possessionStatus === "under_construction") return "Under construction";
  if (l.availableFrom) return `From ${formatDateIST(l.availableFrom)}`;
  return l.possessionStatus === "ready_to_move" ? "Ready to move" : "Available";
}

function specs(l: Listing): [string, string][] {
  const rows: [string, string | null][] = [
    ["Listing ID", l.listingId],
    ["Property type", propertyTypeLabel(l.propertyType)],
    ["Transaction", l.transactionType === "rent" ? "Rent / lease" : "Sale"],
    ["Status", statusLabel(l.listingStatus)],
    [areaTypeLabel(l.areaType), formatArea(l)],
    ["Furnishing", furnishingLabel(l.furnishingStatus)],
    ["Possession", possessionLabel(l.possessionStatus)],
    ["Available from", l.availableFrom ? formatDateIST(l.availableFrom) : null],
    ["Floor", l.floor ? `${l.floor}${l.totalFloors ? ` of ${l.totalFloors}` : ""}` : l.totalFloors ? `${l.totalFloors} floors` : null],
    ["Parking", l.parking],
    ["Facing", l.facing],
    ["Age of property", l.ageYears !== null ? `${l.ageYears} ${l.ageYears === 1 ? "year" : "years"}` : null],
    ["Maintenance", l.maintenanceCharges ? `${formatInrFull(l.maintenanceCharges)} / month` : null],
    ["Security deposit", l.securityDeposit ? formatInrFull(l.securityDeposit) : null],
    ["Last updated", formatDateIST(l.updatedAt)],
  ];
  return rows.filter((r): r is [string, string] => !!r[1]);
}

function Disclosures({ listing: l, settings: s }: { listing: Listing; settings: SiteSettings }) {
  const brokerage =
    l.category === "commercial" ? s.brokerage.commercial || s.brokerage.sale : l.transactionType === "rent" ? s.brokerage.rent : s.brokerage.sale;
  const authoritySite = s.rera.authorityWebsite.trim();
  const agentLine = reraAgentLine(s);
  const needsRera = l.transactionType === "sale" && l.possessionStatus === "under_construction";
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <div className="border border-stone bg-white p-4">
        <p className="font-semibold text-ink">RERA project registration</p>
        {l.reraProjectNumber ? (
          <p className="mt-1">
            <span className="font-mono">{l.reraProjectNumber}</span>
            {l.isDemo ? <span className="badge badge-demo ml-2">Demo value</span> : null}
            <span className="mt-1 block text-xs text-muted">
              Verify this registration on {authoritySite ? <a className="link" href={authoritySite} target="_blank" rel="noopener noreferrer">{authoritySite}</a> : "the State RERA authority's official website"} before making any payment.
            </span>
          </p>
        ) : needsRera || l.isDemo ? (
          <p className="mt-1"><Placeholder text={RERA_PLACEHOLDER} /></p>
        ) : (
          <p className="mt-1 text-muted">
            Not provided. RERA project registration generally applies to new projects; completed / resale properties and rentals may not be
            covered. Please verify the applicable approvals independently.
          </p>
        )}
      </div>
      <div className="border border-stone bg-white p-4">
        <p className="font-semibold text-ink">Agent</p>
        <p className="mt-1">{agentLine.includes("[DEMO ONLY") ? <Placeholder text={agentLine} /> : agentLine}</p>
      </div>
      <div className="border border-stone bg-white p-4">
        <p className="font-semibold text-ink">Brokerage / commission</p>
        <p className="mt-1">{brokerage.trim() ? brokerage : <Placeholder text={placeholder("brokerage terms")} />}</p>
      </div>
      <p className="text-xs text-muted">
        <strong>Listing accuracy:</strong> details are provided by the owner/developer and checked by us in good faith but are not guaranteed.
        Areas, plans and images are indicative. <strong>Price &amp; availability:</strong> prices exclude stamp duty, registration, GST, deposits and
        other charges unless stated, and may change or be withdrawn without notice. This page is not an offer or contract. Read our{" "}
        <Link className="link" href="/disclosures">full disclosures</Link>.
      </p>
    </div>
  );
}

async function Similar({ listing, includeDemo }: { listing: Listing; includeDemo: boolean }) {
  const items = await getSimilarListings(listing, includeDemo, 3);
  if (items.length === 0) return null;
  return (
    <section className="container-page mt-20" aria-labelledby="similar-heading">
      <h2 id="similar-heading" className="text-4xl text-navy">Similar properties</h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <li key={s.id}>
            <PropertyCard listing={s} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <li className="bg-white p-4 shadow-[var(--shadow-card)]">
      <span className="text-gold">{icon}</span>
      <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-0.5 font-semibold text-ink">{value}</p>
    </li>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-3xl text-navy">{title}</h2>
      {children}
    </section>
  );
}

function JsonLd({ listing: l, url }: { listing: Listing; url: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: l.title,
    url,
    datePosted: l.createdAt.toISOString(),
    description: l.description?.slice(0, 500),
    image: l.imageUrls.slice(0, 5).map((i) => (i.startsWith("/") ? `${env.siteUrl}${i}` : i)),
    ...(l.price
      ? { offers: { "@type": "Offer", price: l.price, priceCurrency: "INR", availability: "https://schema.org/InStock", businessFunction: l.transactionType === "rent" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell" } }
      : {}),
    contentLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: `${l.locality}, ${l.city}`, addressRegion: l.state, postalCode: l.pincode ?? undefined, addressCountry: "IN" },
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

function DetailSkeleton() {
  return (
    <div className="container-page pt-6" role="status" aria-label="Loading property">
      <div className="skeleton h-4 w-64" />
      <div className="skeleton mt-5 h-[420px] w-full md:h-[560px]" />
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <div className="skeleton h-12 w-3/4" />
          <div className="skeleton h-5 w-1/3" />
          <div className="skeleton h-16 w-1/2" />
          <div className="skeleton h-40 w-full" />
        </div>
        <div className="skeleton h-[560px]" />
      </div>
    </div>
  );
}
