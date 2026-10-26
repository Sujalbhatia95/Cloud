import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shree Krishna Associate",
    short_name: "Shree Krishna",
    description: "Buy, rent and sell property with Shree Krishna Associate.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f3",
    theme_color: "#0b1a4f",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
