import Link from "next/link";
import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { EmptyRow, Notice, PageHeader, StatusBadge, Table, first } from "@/components/admin/ui";
import { getDb, schema } from "@/db";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/roles";
import { LISTING_STATUSES } from "@/lib/listings/constants";
import { formatDateIST, formatPrice, propertyTypeLabel } from "@/lib/listings/format";
import { listingPath } from "@/lib/listings/slug";
import { deleteListingAction, setListingStatusAction, toggleFeaturedAction } from "../../actions/listings";

const PER_PAGE = 50;

export default async function AdminListings({ searchParams }: PageProps<"/admin/listings">) {
  const user = await requirePage("listings:read");
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 80);
  const status = first(sp.status);
  const kind = first(sp.kind);
  const flag = first(sp.flag);
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const L = schema.listings;
  const conds: SQL[] = [];
  if (q) {
    const p = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conds.push(or(ilike(L.listingId, p), ilike(L.title, p), ilike(L.city, p), ilike(L.locality, p))!);
  }
  if (status && status in LISTING_STATUSES) conds.push(eq(L.listingStatus, status));
  if (kind === "demo") conds.push(eq(L.isDemo, true));
  if (kind === "real") conds.push(eq(L.isDemo, false));
  if (flag === "rera")
    conds.push(and(eq(L.transactionType, "sale"), eq(L.possessionStatus, "under_construction"), isNull(L.reraProjectNumber))!);
  if (flag === "noimages") conds.push(sql`cardinality(${L.imageUrls}) = 0`);
  const where = conds.length ? and(...conds) : undefined;
  const db = getDb();
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(L).where(where);
  const rows = await db.select().from(L).where(where).orderBy(desc(L.updatedAt), asc(L.listingId)).limit(PER_PAGE).offset((page - 1) * PER_PAGE);
  const canWrite = can(user.role, "listings:write");
  const backQs = new URLSearchParams(Object.entries({ q, status, kind, flag, page: page > 1 ? String(page) : "" }).filter(([, v]) => v)).toString();
  const back = `/admin/listings${backQs ? `?${backQs}` : ""}`;
  const pages = Math.ceil(count / PER_PAGE);

  return (
    <>
      <PageHeader
        title="Listings"
        description="Every property in the database. Use spreadsheet imports for weekly bulk updates, or edit single listings here."
        actions={
          canWrite ? (
            <>
              <Link href="/admin/imports" className="btn btn-outline btn-sm">Upload spreadsheet</Link>
              <Link href="/admin/listings/new" className="btn btn-primary btn-sm">Add listing</Link>
            </>
          ) : null
        }
      />
      <Notice notice={sp.notice} error={sp.error} />
      <form className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]" role="search">
        <input name="q" defaultValue={q} placeholder="Search ID, title, city or locality" className="field" aria-label="Search listings" />
        <select name="status" defaultValue={status} className="field" aria-label="Status">
          <option value="">All statuses</option>
          {Object.entries(LISTING_STATUSES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="kind" defaultValue={kind} className="field" aria-label="Real or demo">
          <option value="">Real and demo</option>
          <option value="real">Real listings only</option>
          <option value="demo">Demo listings only</option>
        </select>
        <select name="flag" defaultValue={flag} className="field" aria-label="Flags">
          <option value="">No flag filter</option>
          <option value="rera">Missing RERA number (under construction)</option>
          <option value="noimages">No images</option>
        </select>
        <button className="btn btn-dark" type="submit">Filter</button>
      </form>
      <p className="mb-3 text-sm text-muted">{count.toLocaleString("en-IN")} listing(s)</p>
      <Table>
        <thead>
          <tr>
            <th>Listing</th>
            <th>Price</th>
            <th>Location</th>
            <th>Status</th>
            <th>Featured</th>
            <th>Updated</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow colSpan={7} text="No listings match." /> : null}
          {rows.map((l) => (
            <tr key={l.id}>
              <td>
                <p className="font-mono text-xs text-muted">
                  {l.listingId} {l.isDemo ? <span className="badge badge-demo ml-1">Demo</span> : null}
                </p>
                <p className="font-semibold text-ink">{l.title}</p>
                <p className="text-xs text-muted">{propertyTypeLabel(l.propertyType)} · {l.transactionType === "rent" ? "Rent" : "Sale"} · via {l.source}</p>
              </td>
              <td className="whitespace-nowrap">{formatPrice(l)}</td>
              <td>{l.locality}, {l.city}</td>
              <td>
                {canWrite ? (
                  <form action={setListingStatusAction} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="back" value={back} />
                    <select name="status" defaultValue={l.listingStatus} className="field !min-h-8 !py-1 text-xs" aria-label={`Status of ${l.listingId}`}>
                      {Object.entries(LISTING_STATUSES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <button className="btn btn-outline btn-sm !min-h-8 !px-2" type="submit">Set</button>
                  </form>
                ) : (
                  <StatusBadge status={l.listingStatus} />
                )}
              </td>
              <td>
                {canWrite ? (
                  <form action={toggleFeaturedAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="back" value={back} />
                    <button type="submit" className={`badge ${l.featured ? "badge-gold" : "badge-muted"}`} title="Toggle featured">
                      {l.featured ? "★ Featured" : "☆ No"}
                    </button>
                  </form>
                ) : l.featured ? "Yes" : "No"}
              </td>
              <td className="whitespace-nowrap text-xs">{formatDateIST(l.updatedAt)}</td>
              <td>
                <div className="flex justify-end gap-1.5">
                  {["active", "under_offer", "sold", "rented"].includes(l.listingStatus) ? (
                    <Link href={listingPath(l)} target="_blank" className="btn btn-outline btn-sm">View</Link>
                  ) : null}
                  {canWrite ? <Link href={`/admin/listings/${l.id}`} className="btn btn-outline btn-sm">Edit</Link> : null}
                  {can(user.role, "listings:delete") ? (
                    <form action={deleteListingAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <ConfirmButton message={`Permanently delete ${l.listingId}? Prefer setting the status to Archived — that keeps history.`} className="btn btn-sm text-danger">
                        Delete
                      </ConfirmButton>
                    </form>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {pages > 1 ? (
        <nav className="mt-5 flex gap-2" aria-label="Pagination">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/listings?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(backQs)), page: String(p) })}`}
              aria-current={p === page ? "page" : undefined}
              className={`btn btn-sm ${p === page ? "btn-dark" : "btn-outline"}`}
            >
              {p}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}
