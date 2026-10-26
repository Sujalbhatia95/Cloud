import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { getSessionUser } from "@/lib/auth/session";
import { can, ROLES, type Permission } from "@/lib/auth/roles";
import { logoutAction } from "../actions/auth";

/** Admin pages always render per request (they read the session), so navigations may wait for data. */
export const instant = false;

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

const ITEMS: { href: string; label: string; permission: Permission }[] = [
  { href: "/admin", label: "Dashboard", permission: "dashboard" },
  { href: "/admin/listings", label: "Listings", permission: "listings:read" },
  { href: "/admin/imports", label: "Spreadsheet imports", permission: "imports" },
  { href: "/admin/enquiries", label: "Enquiries & showings", permission: "enquiries" },
  { href: "/admin/emails", label: "Email delivery", permission: "emails" },
  { href: "/admin/comparables", label: "Valuation data", permission: "comparables" },
  { href: "/admin/compliance", label: "Compliance checklist", permission: "compliance" },
  { href: "/admin/settings", label: "Business settings", permission: "settings" },
  { href: "/admin/content", label: "Legal & page content", permission: "content" },
  { href: "/admin/users", label: "Staff accounts", permission: "users" },
  { href: "/admin/audit", label: "Audit log", permission: "audit" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory lg:flex-row">
      <aside className="bg-navy-900 text-white lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block">
          <Link href="/admin" className="flex items-center gap-3">
            <Image src="/brand/mark-transparent.png" alt="" width={772} height={772} className="h-10 w-10" sizes="40px" />
            <span className="text-sm font-semibold leading-tight">
              Shree Krishna
              <span className="block text-[0.65rem] uppercase tracking-[0.2em] text-white/60">Admin</span>
            </span>
          </Link>
          <Link href="/" className="text-xs text-white/60 hover:text-white lg:mt-4 lg:inline-block" target="_blank">
            View website ↗
          </Link>
        </div>
        <Suspense fallback={<div className="h-10" />}>
          <SessionNav />
        </Suspense>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:py-10">{children}</div>
      </div>
    </div>
  );
}

async function SessionNav() {
  const user = await getSessionUser();
  if (!user) return null;
  const items = ITEMS.filter((i) => can(user.role, i.permission)).map(({ href, label }) => ({ href, label }));
  return (
    <>
      <Suspense fallback={null}>
        <AdminNav items={items} />
      </Suspense>
      <div className="mt-6 border-t border-white/10 px-5 py-4 text-xs text-white/70">
        <p className="font-semibold text-white">{user.name}</p>
        <p className="truncate">{user.email}</p>
        <p className="mt-1 text-white/50">{ROLES[user.role].split(" — ")[0]}</p>
        <div className="mt-3 flex gap-3">
          <Link href="/admin/account" className="underline underline-offset-2 hover:text-white">My account</Link>
          <form action={logoutAction}>
            <button type="submit" className="underline underline-offset-2 hover:text-white">Sign out</button>
          </form>
        </div>
      </div>
    </>
  );
}
