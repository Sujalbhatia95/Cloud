"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose, IconMenu } from "@/components/ui/icons";

/**
 * Full-screen menu for small screens. The panel is portalled to <body>: the sticky header uses
 * backdrop-filter, which would otherwise turn it into the containing block for `position: fixed`
 * and squeeze the menu into the header's height.
 */
export function MobileMenu({ items }: { items: readonly { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("nav a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // UI state survives navigations (Cache Components keeps routes mounted), so close explicitly.
  useEffect(() => () => setOpen(false), []);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center text-navy"
        aria-expanded={open}
        aria-controls={open ? "mobile-menu" : undefined}
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <IconMenu size={26} />
      </button>
      {open
        ? createPortal(
            <div
              id="mobile-menu"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              className="fixed inset-0 z-[60] overflow-y-auto bg-ivory lg:hidden"
            >
              <div className="container-page flex h-[68px] items-center justify-between border-b border-stone">
                <span className="eyebrow">Menu</span>
                <button type="button" className="inline-flex h-11 w-11 items-center justify-center text-navy" aria-label="Close menu" onClick={close}>
                  <IconClose size={26} />
                </button>
              </div>
              <nav aria-label="Mobile" className="container-page py-6">
                <ul className="divide-y divide-stone border-y border-stone">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between py-4 font-display text-3xl text-navy"
                      >
                        {item.label}
                        <span aria-hidden className="text-gold">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/sell" onClick={() => setOpen(false)} className="btn btn-dark mt-8 w-full">
                  List your property
                </Link>
                <Link href="/contact" onClick={() => setOpen(false)} className="btn btn-outline mt-3 w-full">
                  Talk to us
                </Link>
              </nav>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
