import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-4 text-5xl text-navy sm:text-6xl">This page isn&apos;t available</h1>
      <p className="mt-4 max-w-md text-muted">
        The property may have been sold, let or withdrawn, or the link may be incorrect.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/buy" className="btn btn-primary">Browse properties</Link>
        <Link href="/" className="btn btn-outline">Go to the home page</Link>
      </div>
    </main>
  );
}
