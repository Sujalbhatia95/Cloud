"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/buy", label: "Buy" },
  { href: "/rent", label: "Rent" },
  { href: "/commercial", label: "Commercial" },
  { href: "/sell", label: "Sell" },
  { href: "/valuation", label: "Valuation" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

function Links({ active }: { active: string | null }) {
  return (
    <ul className="flex items-center gap-7">
      {NAV_ITEMS.map((item) => {
        const isActive = active !== null && (active === item.href || active.startsWith(`${item.href}/`));
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`relative py-2 text-[0.84rem] font-semibold tracking-[0.04em] transition-colors hover:text-royal ${
                isActive ? "text-royal" : "text-ink"
              } after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-gold after:transition-transform ${
                isActive ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function NavLinks() {
  const pathname = usePathname();
  return <Links active={pathname} />;
}

export function StaticNavLinks() {
  return <Links active={null} />;
}
