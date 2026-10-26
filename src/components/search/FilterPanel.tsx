"use client";

import { useState, type ReactNode } from "react";
import { IconFilter } from "@/components/ui/icons";

/** On small screens the filters collapse behind a toggle. Without JavaScript they are always visible. */
export function FilterPanel({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        className="btn btn-outline w-full lg:hidden"
        aria-expanded={open}
        aria-controls="search-filters"
        onClick={() => setOpen((v) => !v)}
      >
        <IconFilter size={18} />
        {open ? "Hide filters" : `Filters${activeCount ? ` (${activeCount})` : ""}`}
      </button>
      <div id="search-filters" data-open={open ? "" : undefined} className="filter-panel mt-4 lg:mt-0">
        {children}
      </div>
    </div>
  );
}

export function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
