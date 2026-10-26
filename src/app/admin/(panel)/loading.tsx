export default function AdminLoading() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <div className="skeleton h-10 w-72" />
      <div className="skeleton h-4 w-96 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
      <div className="skeleton h-80" />
    </div>
  );
}
