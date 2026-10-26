import Link from "next/link";
import type { Listing } from "@/db/schema";
import { IconArea, IconBath, IconBed, IconPin } from "@/components/ui/icons";
import { formatArea, formatPrice, propertyTypeLabel, statusLabel } from "@/lib/listings/format";
import { listingPath } from "@/lib/listings/slug";
import { PropertyImage } from "./PropertyImage";

type CardListing = Pick<
  Listing,
  | "listingId" | "slug" | "title" | "price" | "transactionType" | "propertyType" | "listingStatus" | "locality" | "city"
  | "bedrooms" | "bathrooms" | "areaValue" | "areaUnit" | "imageUrls" | "featured" | "isDemo" | "possessionStatus"
>;

export function PropertyCard({ listing: l, priority = false, sizes }: { listing: CardListing; priority?: boolean; sizes?: string }) {
  const href = listingPath(l);
  const area = formatArea(l);
  return (
    <article className="group relative flex h-full flex-col bg-white shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]">
      <div className="img-zoom relative aspect-[4/3] overflow-hidden bg-sand">
        <PropertyImage
          src={l.imageUrls[0]}
          alt={`${l.title}${l.isDemo ? " (demo image)" : ""}`}
          sizes={sizes ?? "(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"}
          priority={priority}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {l.isDemo ? <span className="badge badge-demo">Demo listing</span> : null}
          <span className="badge badge-dark">{l.transactionType === "rent" ? "For rent" : "For sale"}</span>
          {l.listingStatus === "under_offer" ? <span className="badge bg-gold text-white">{statusLabel(l.listingStatus)}</span> : null}
          {l.featured && l.listingStatus === "active" ? <span className="badge bg-white/90 text-navy">Featured</span> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="font-display text-[1.65rem] leading-none text-navy">{formatPrice(l)}</p>
        <h3 className="mt-2 font-sans text-[0.95rem] font-semibold leading-snug text-ink">
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {l.title}
          </Link>
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
          <IconPin size={15} className="shrink-0 text-gold" />
          <span className="truncate">
            {l.locality}, {l.city}
          </span>
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-stone pt-3.5 text-[0.8rem] text-muted mt-4">
          <span className="font-semibold uppercase tracking-wide text-[0.7rem] text-gold-700">{propertyTypeLabel(l.propertyType)}</span>
          {l.bedrooms !== null ? (
            <span className="inline-flex items-center gap-1">
              <IconBed size={15} /> {l.bedrooms} <span className="sr-only">{l.bedrooms === 1 ? "bedroom" : "bedrooms"}</span>
            </span>
          ) : null}
          {l.bathrooms !== null ? (
            <span className="inline-flex items-center gap-1">
              <IconBath size={15} /> {l.bathrooms} <span className="sr-only">{l.bathrooms === 1 ? "bathroom" : "bathrooms"}</span>
            </span>
          ) : null}
          {area ? (
            <span className="inline-flex items-center gap-1">
              <IconArea size={15} /> {area}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="bg-white shadow-[var(--shadow-card)]" aria-hidden>
      <div className="skeleton aspect-[4/3]" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-7 w-1/2" />
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-4 w-2/5" />
        <div className="skeleton mt-4 h-4 w-full" />
      </div>
    </div>
  );
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading properties">
      {Array.from({ length: count }, (_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}
