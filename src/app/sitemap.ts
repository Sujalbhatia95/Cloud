import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getListingsForSitemap } from "@/lib/listings/queries";
import { listingPath } from "@/lib/listings/slug";
import { siteUrlFromEnv } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Always generated per request so new listings appear immediately (never baked in at build time).
  await connection();
  const site = siteUrlFromEnv();
  const pages = ["", "/buy", "/rent", "/commercial", "/sell", "/valuation", "/about", "/contact", "/disclosures", "/privacy", "/terms"];
  const staticEntries: MetadataRoute.Sitemap = pages.map((p) => ({
    url: `${site}${p}`,
    changeFrequency: p === "" || p === "/buy" || p === "/rent" ? "daily" : "monthly",
    priority: p === "" ? 1 : p === "/buy" || p === "/rent" || p === "/commercial" ? 0.9 : 0.5,
  }));
  let listings: Awaited<ReturnType<typeof getListingsForSitemap>> = [];
  try {
    // Demo listings are never included (they are marked noindex).
    listings = await getListingsForSitemap(false);
  } catch (e) {
    console.error("[sitemap] could not load listings", e);
  }
  return [
    ...staticEntries,
    ...listings.map((l) => ({ url: `${site}${listingPath(l)}`, lastModified: l.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
