"use client";

import { useState } from "react";
import { IconShare, IconWhatsApp } from "@/components/ui/icons";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* user cancelled */
    }
  }
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={share} className="btn btn-outline btn-sm">
        <IconShare size={16} />
        <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline btn-sm"
        aria-label="Share on WhatsApp"
      >
        <IconWhatsApp size={16} />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>
    </div>
  );
}
