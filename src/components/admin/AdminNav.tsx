"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <nav aria-label="Admin">
      <button
        type="button"
        className="mx-5 mb-3 w-[calc(100%-2.5rem)] border border-white/20 px-3 py-2 text-left text-sm lg:hidden"
        aria-expanded={open}
        aria-controls="admin-nav-list"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close menu" : "Menu"}
      </button>
      <ul id="admin-nav-list" className={`${open ? "block" : "hidden"} space-y-0.5 px-3 lg:block`}>
        {items.map((i) => {
          const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`block rounded-sm px-3 py-2 text-sm transition-colors ${active ? "bg-white/12 font-semibold text-white" : "text-white/75 hover:bg-white/5 hover:text-white"}`}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
