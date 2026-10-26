"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-4 text-5xl text-navy">We couldn&apos;t load this page</h1>
      <p className="mt-4 max-w-md text-muted">Please try again in a moment. If the problem continues, contact us by email.</p>
      {error.digest ? <p className="mt-2 font-mono text-xs text-muted">Reference: {error.digest}</p> : null}
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/" className="btn btn-outline">Home</Link>
      </div>
    </div>
  );
}
