import Link from "next/link";
import { PropertyCard, PropertyGridSkeleton } from "@/components/property/PropertyCard";
import { IconArrowLeft, IconArrowRight, IconClose, IconSearch } from "@/components/ui/icons";
import {
  CATEGORIES,
  FURNISHING,
  PAGE_SIZE,
  PROPERTY_TYPES,
  SORT_OPTIONS,
  TRANSACTION_TYPES,
} from "@/lib/listings/constants";
import { formatInrCompact, propertyTypeLabel } from "@/lib/listings/format";
import { getLocationSuggestions, searchListings } from "@/lib/listings/queries";
import {
  AVAILABILITY_OPTIONS,
  BUY_PRICE_STEPS,
  RENT_PRICE_STEPS,
  parseSearchParams,
  toQueryString,
  type SearchFilters,
  type SearchPreset,
} from "@/lib/listings/search-params";
import { getSettings } from "@/lib/settings";
import { CleanForm } from "./CleanForm";
import { AutoSubmitSelect, FilterPanel } from "./FilterPanel";

type Props = {
  basePath: "/buy" | "/rent" | "/commercial";
  preset: SearchPreset;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function SearchResults({ basePath, preset, searchParams }: Props) {
  const raw = await searchParams;
  const f = parseSearchParams(raw, preset);
  const settings = await getSettings();
  const [result, suggestions] = await Promise.all([searchListings(f, settings.demoMode), getLocationSuggestions(settings.demoMode)]);
  const chips = activeChips(f, preset);
  const from = result.total === 0 ? 0 : (result.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(result.page * PAGE_SIZE, result.total);

  return (
    <div className="container-page pb-24">
      <FilterForm f={f} basePath={basePath} preset={preset} suggestions={suggestions} activeCount={chips.length} />

      {chips.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <Link
              key={c.key}
              href={`${basePath}${toQueryString(f, preset, { ...c.clear, page: 1 })}`}
              className="inline-flex items-center gap-1.5 bg-royal-50 px-3 py-1.5 text-xs font-semibold text-royal hover:bg-royal hover:text-white"
              aria-label={`Remove filter: ${c.label}`}
            >
              {c.label}
              <IconClose size={13} />
            </Link>
          ))}
          <Link href={basePath} className="ml-1 text-xs font-semibold text-muted underline underline-offset-2 hover:text-ink">
            Clear all filters
          </Link>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-1 border-b border-stone pb-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-muted" aria-live="polite" role="status">
          <strong className="text-base text-ink">{result.total.toLocaleString("en-IN")}</strong>{" "}
          {result.total === 1 ? "property" : "properties"}
          {result.total > 0 ? ` · showing ${from}–${to}` : ""}
        </p>
      </div>

      {result.items.length === 0 ? (
        <div className="mt-10 border border-dashed border-stone-400 bg-white p-10 text-center">
          <h2 className="font-display text-3xl text-navy">No properties match these filters</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">
            Try widening your budget, removing a filter or searching a nearby locality. New listings are added every week.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={basePath} className="btn btn-outline btn-sm">Clear all filters</Link>
            <Link href="/contact" className="btn btn-primary btn-sm">Tell us what you need</Link>
          </div>
        </div>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((l, i) => (
            <li key={l.id}>
              <PropertyCard listing={l} priority={i < 3} />
            </li>
          ))}
        </ul>
      )}

      {result.pageCount > 1 ? <Pagination basePath={basePath} f={f} preset={preset} page={result.page} pageCount={result.pageCount} /> : null}
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="container-page pb-24">
      <div className="skeleton h-28" />
      <div className="skeleton mt-8 h-6 w-48" />
      <div className="mt-8">
        <PropertyGridSkeleton count={6} />
      </div>
    </div>
  );
}

function priceOptions(f: SearchFilters, preset: SearchPreset) {
  const rent = (preset.deal ?? f.deal) === "rent";
  const steps = rent ? RENT_PRICE_STEPS : BUY_PRICE_STEPS;
  const withCurrent = new Set<number>(steps);
  if (f.minPrice) withCurrent.add(f.minPrice);
  if (f.maxPrice) withCurrent.add(f.maxPrice);
  return { rent, values: Array.from(withCurrent).sort((a, b) => a - b) };
}

function FilterForm({
  f,
  basePath,
  preset,
  suggestions,
  activeCount,
}: {
  f: SearchFilters;
  basePath: string;
  preset: SearchPreset;
  suggestions: { cities: string[]; localities: string[]; states: string[] };
  activeCount: number;
}) {
  const { rent, values } = priceOptions(f, preset);
  const typeOptions = Object.entries(PROPERTY_TYPES).filter(([, v]) =>
    preset.category ? v.category === preset.category : f.category ? v.category === f.category : v.category !== "commercial" || basePath !== "/buy",
  );
  const label = "text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted";
  const fieldCls = "field mt-1 !min-h-[2.6rem] !py-2 text-sm";
  return (
    <CleanForm action={basePath} className="bg-white p-4 shadow-[var(--shadow-card)] sm:p-5" aria-label="Search filters">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="flex-1">
          <span className={label}>Location</span>
          <span className="relative mt-1 block">
            <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={f.q}
              list="search-locations"
              placeholder="City, locality, PIN code or listing ID"
              className="field !min-h-[2.6rem] !py-2 pl-9 text-sm"
              autoComplete="off"
            />
          </span>
          <datalist id="search-locations">
            {suggestions.cities.map((c) => (
              <option key={c} value={c} />
            ))}
            {suggestions.localities.map((l) => (
              <option key={l} value={l.split(",")[0]} label={l} />
            ))}
          </datalist>
        </label>
        <label className="sm:w-auto">
          <span className={label}>Sort by</span>
          <AutoSubmitSelect name="sort" defaultValue={f.sort} className={fieldCls}>
            {Object.entries(SORT_OPTIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </AutoSubmitSelect>
        </label>
      </div>

      <div className="mt-3">
        <FilterPanel activeCount={activeCount}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {basePath === "/commercial" ? (
              <label>
                <span className={label}>Buy or rent</span>
                <select name="deal" defaultValue={f.deal ?? ""} className={fieldCls}>
                  <option value="">Buy or rent</option>
                  {Object.entries(TRANSACTION_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                <span className={label}>Category</span>
                <select name="category" defaultValue={f.category ?? ""} className={fieldCls}>
                  <option value="">All categories</option>
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span className={label}>Property type</span>
              <select name="type" defaultValue={f.type ?? ""} className={fieldCls}>
                <option value="">Any type</option>
                {typeOptions.map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Min {rent ? "rent" : "price"}</span>
              <select name="minPrice" defaultValue={f.minPrice ? String(f.minPrice) : ""} className={fieldCls}>
                <option value="">No min</option>
                {values.map((v) => (
                  <option key={v} value={v}>
                    {formatInrCompact(v)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Max {rent ? "rent" : "price"}</span>
              <select name="maxPrice" defaultValue={f.maxPrice ? String(f.maxPrice) : ""} className={fieldCls}>
                <option value="">No max</option>
                {values.map((v) => (
                  <option key={v} value={v}>
                    {formatInrCompact(v)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Bedrooms</span>
              <select name="beds" defaultValue={f.beds ? String(f.beds) : ""} className={fieldCls}>
                <option value="">Any</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Bathrooms</span>
              <select name="baths" defaultValue={f.baths ? String(f.baths) : ""} className={fieldCls}>
                <option value="">Any</option>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Furnishing</span>
              <select name="furnishing" defaultValue={f.furnishing ?? ""} className={fieldCls}>
                <option value="">Any</option>
                {Object.entries(FURNISHING).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2">
              <span className={label}>Availability</span>
              <select name="availability" defaultValue={f.availability} className={fieldCls}>
                {Object.entries(AVAILABILITY_OPTIONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Min area (sq ft)</span>
              <input name="minArea" inputMode="numeric" defaultValue={f.minArea ?? ""} className={fieldCls} placeholder="Any" />
            </label>
            <label>
              <span className={label}>Max area (sq ft)</span>
              <input name="maxArea" inputMode="numeric" defaultValue={f.maxArea ?? ""} className={fieldCls} placeholder="Any" />
            </label>
            <label>
              <span className={label}>City</span>
              <select name="city" defaultValue={f.city} className={fieldCls}>
                <option value="">Any city</option>
                {Array.from(new Set([...suggestions.cities, ...(f.city ? [f.city] : [])])).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Locality</span>
              <input name="locality" defaultValue={f.locality} className={fieldCls} placeholder="Any" />
            </label>
            <label>
              <span className={label}>State / UT</span>
              <select name="state" defaultValue={f.state} className={fieldCls}>
                <option value="">Any state</option>
                {Array.from(new Set([...suggestions.states, ...(f.state ? [f.state] : [])])).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>PIN code</span>
              <input name="pincode" inputMode="numeric" maxLength={6} defaultValue={f.pincode} className={fieldCls} placeholder="e.g. 411045" />
            </label>
            <div className="col-span-2 flex items-end gap-2 md:col-span-4 lg:col-span-2">
              <button type="submit" className="btn btn-primary flex-1">
                <IconSearch size={17} /> Apply filters
              </button>
              <Link href={basePath} className="btn btn-outline">
                Clear
              </Link>
            </div>
          </div>
        </FilterPanel>
      </div>
    </CleanForm>
  );
}

type Chip = { key: string; label: string; clear: Partial<Record<keyof SearchFilters, unknown>> };

function activeChips(f: SearchFilters, preset: SearchPreset): Chip[] {
  const chips: Chip[] = [];
  const add = (key: keyof SearchFilters, label: string) => chips.push({ key, label, clear: { [key]: null } });
  if (f.q) add("q", `“${f.q}”`);
  if (f.deal && !preset.deal) add("deal", TRANSACTION_TYPES[f.deal]);
  if (f.category && !preset.category) add("category", CATEGORIES[f.category]);
  if (f.type) add("type", propertyTypeLabel(f.type));
  if (f.minPrice) add("minPrice", `From ${formatInrCompact(f.minPrice)}`);
  if (f.maxPrice) add("maxPrice", `Up to ${formatInrCompact(f.maxPrice)}`);
  if (f.beds) add("beds", `${f.beds}+ beds`);
  if (f.baths) add("baths", `${f.baths}+ baths`);
  if (f.minArea) add("minArea", `≥ ${f.minArea.toLocaleString("en-IN")} sq ft`);
  if (f.maxArea) add("maxArea", `≤ ${f.maxArea.toLocaleString("en-IN")} sq ft`);
  if (f.furnishing) add("furnishing", FURNISHING[f.furnishing]);
  if (f.availability) add("availability", AVAILABILITY_OPTIONS[f.availability]);
  if (f.city) add("city", f.city);
  if (f.locality) add("locality", f.locality);
  if (f.state) add("state", f.state);
  if (f.pincode) add("pincode", `PIN ${f.pincode}`);
  return chips;
}

function Pagination({ basePath, f, preset, page, pageCount }: { basePath: string; f: SearchFilters; preset: SearchPreset; page: number; pageCount: number }) {
  const href = (p: number) => `${basePath}${toQueryString(f, preset, { page: p })}`;
  const pages: (number | "…")[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-outline btn-sm" rel="prev">
          <IconArrowLeft size={16} /> <span className="hidden sm:inline">Previous</span>
        </Link>
      ) : null}
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-2 text-muted">…</span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={`inline-flex h-9 min-w-9 items-center justify-center px-2 text-sm font-semibold ${
              p === page ? "bg-navy text-white" : "text-ink hover:bg-sand"
            }`}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={href(page + 1)} className="btn btn-outline btn-sm" rel="next">
          <span className="hidden sm:inline">Next</span> <IconArrowRight size={16} />
        </Link>
      ) : null}
    </nav>
  );
}
