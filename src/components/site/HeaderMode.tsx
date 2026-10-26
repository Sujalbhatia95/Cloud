"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Pages whose first section is a full-bleed photo that the header sits on until the visitor scrolls. */
const OVERLAY_PATHS = new Set(["/"]);
const SCROLL_THRESHOLD = 24;

/**
 * Keeps two flags on <html> for the header styles in globals.css:
 * data-overlay (this page starts with a cover photo) and data-scrolled (the visitor has scrolled).
 * The root layout sets both before first paint; this keeps them right after client navigations.
 */
export function HeaderMode() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (OVERLAY_PATHS.has(pathname)) root.dataset.overlay = "";
    else delete root.dataset.overlay;
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      if (window.scrollY > SCROLL_THRESHOLD) root.dataset.scrolled = "";
      else delete root.dataset.scrolled;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return null;
}
