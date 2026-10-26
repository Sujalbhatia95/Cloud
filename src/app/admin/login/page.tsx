import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false, follow: false } };

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-sand px-4 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mx-auto mb-8 block w-fit" aria-label="Back to the website">
          <Image src="/brand/logo.png" alt="Shree Krishna Associate" width={875} height={565} priority sizes="120px" className="h-20 w-auto mix-blend-multiply" />
        </Link>
        <div className="bg-white p-8 shadow-[var(--shadow-lift)]">
          <h1 className="font-display text-3xl text-navy">Staff sign in</h1>
          <p className="mb-6 mt-1 text-sm text-muted">For Shree Krishna Associate team members only.</p>
          <Suspense fallback={<div className="skeleton h-56" />}>
            <LoginFormWithNext searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-muted">Access is logged. Unauthorised access is prohibited.</p>
      </div>
    </main>
  );
}

async function LoginFormWithNext({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/admin") ? sp.next : "";
  return <LoginForm next={next} />;
}
