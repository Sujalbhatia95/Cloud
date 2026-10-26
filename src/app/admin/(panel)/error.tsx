"use client";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="border border-danger bg-danger-50 p-6 text-danger">
      <h1 className="font-display text-3xl">Something went wrong</h1>
      <p className="mt-2 text-sm">{error.message || "The page could not be loaded."}</p>
      {error.digest ? <p className="mt-1 font-mono text-xs">Reference: {error.digest}</p> : null}
      <button type="button" className="btn btn-outline btn-sm mt-4" onClick={reset}>Try again</button>
    </div>
  );
}
