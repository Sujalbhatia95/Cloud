export function slugify(input: string, maxLength = 80): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug || "property";
  return slug.slice(0, maxLength).replace(/-[^-]*$/, "") || "property";
}

/** Canonical public path for a listing: /property/<listing-id>/<slug> */
export function listingPath(l: { listingId: string; slug: string }): string {
  return `/property/${encodeURIComponent(l.listingId.toLowerCase())}/${l.slug}`;
}
