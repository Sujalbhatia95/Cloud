import type { MetadataRoute } from "next";
import { siteUrlFromEnv } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const site = siteUrlFromEnv();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
