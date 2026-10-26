import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
/** HTTPS-only protections are enabled when the site is served over https (always in real deployments). */
const isHttps = (process.env.SITE_URL ?? "").startsWith("https://");

/**
 * Hosts whose images may be optimised (resized / converted to WebP/AVIF) by Next.js.
 * Images from any other https host still display, just without optimisation.
 * Example: NEXT_PUBLIC_IMAGE_HOSTS=res.cloudinary.com,*.supabase.co,lh3.googleusercontent.com
 */
const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "lh3.googleusercontent.com")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://challenges.cloudflare.com${isDev ? " ws: http://localhost:*" : ""}`,
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  ...(isHttps ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["exceljs", "@e965/xlsx"],
  experimental: {
    serverActions: {
      // Spreadsheet uploads are capped at 4 MB in code; leave room for multipart overhead.
      bodySizeLimit: "5mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
    remotePatterns: imageHosts.map((hostname) => ({ protocol: "https" as const, hostname, pathname: "/**" })),
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
};

export default nextConfig;
