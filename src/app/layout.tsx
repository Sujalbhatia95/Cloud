import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Shree Krishna Associate — Homes, Rentals & Commercial Property",
    template: "%s | Shree Krishna Associate",
  },
  description:
    "Buy, rent or sell residential and commercial property with Shree Krishna Associate. Search verified listings, schedule a viewing, or request an owner consultation.",
  applicationName: "Shree Krishna Associate",
  openGraph: {
    type: "website",
    siteName: "Shree Krishna Associate",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1a4f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${display.variable} ${sans.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Marks JS as available so scroll-reveal styles only apply when they can be undone. */}
        <script
          dangerouslySetInnerHTML={{
            // Before first paint: enable reveal animations, and let the header sit on the home page's cover photo.
            __html:
              "var d=document.documentElement;d.classList.add('js');if(location.pathname==='/')d.dataset.overlay='';if(scrollY>24)d.dataset.scrolled=''",
          }}
        />
      </head>
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
