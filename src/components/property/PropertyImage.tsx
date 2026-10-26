import Image from "next/image";

const OPTIMISED_HOSTS = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "lh3.googleusercontent.com")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

function hostAllowed(host: string): boolean {
  return OPTIMISED_HOSTS.some((pattern) =>
    pattern.startsWith("*.") ? host.endsWith(pattern.slice(1)) : pattern.startsWith("**.") ? host.endsWith(pattern.slice(2)) : host === pattern,
  );
}

/** Local and allow-listed images are resized/converted by Next.js; other https images are lazy-loaded as-is. */
export function canOptimise(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    return hostAllowed(new URL(src).hostname.toLowerCase());
  } catch {
    return false;
  }
}

type Props = {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

/** Fills its (relatively-positioned) parent. Shows a branded placeholder when there is no photo. */
export function PropertyImage({ src, alt, sizes, priority, className = "object-cover text-transparent" }: Props) {
  if (!src) return <NoPhoto />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={75}
      unoptimized={!canOptimise(src)}
      className={className}
    />
  );
}

export function NoPhoto({ label = "Photos coming soon" }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-sand text-stone-400">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden>
        <path d="M8 26 28 10l20 16v20H8V26Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M22 46V32h12v14" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{label}</span>
    </div>
  );
}
