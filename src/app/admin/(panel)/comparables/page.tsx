import { desc } from "drizzle-orm";
import { ConfirmButton, PendingButton } from "@/components/admin/ConfirmButton";
import { Card, EmptyRow, Notice, PageHeader, Table } from "@/components/admin/ui";
import { getDb, schema } from "@/db";
import { requirePage } from "@/lib/auth/guards";
import { AREA_TYPES, AREA_UNITS, PROPERTY_TYPES } from "@/lib/listings/constants";
import { formatDateIST, formatInrFull, propertyTypeLabel } from "@/lib/listings/format";
import { addComparableAction, deleteComparableAction } from "../../actions/users";

export default async function ComparablesPage({ searchParams }: PageProps<"/admin/comparables">) {
  await requirePage("comparables");
  const sp = await searchParams;
  const rows = await getDb().select().from(schema.marketComparables).orderBy(desc(schema.marketComparables.transactionDate)).limit(500);
  return (
    <>
      <PageHeader
        title="Valuation data"
        description="Verified sale transactions used by the public estimate calculator. Only enter deals you can evidence (e.g. your own closed transactions or registered sale deeds). With at least 3 matching records in a city, the calculator shows an indicative range instead of an illustrative one."
      />
      <Notice notice={sp.notice} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Table>
          <thead><tr><th>Date</th><th>Location</th><th>Property</th><th>Price</th><th>₹ / sq ft</th><th>Source</th><th /></tr></thead>
          <tbody>
            {rows.length === 0 ? <EmptyRow colSpan={7} text="No verified comparables yet — the calculator will label all results as illustrative." /> : null}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-xs">{formatDateIST(r.transactionDate)}</td>
                <td className="text-xs">{r.locality}, {r.city}</td>
                <td className="text-xs">{propertyTypeLabel(r.propertyType)}<br />{Math.round(r.areaSqft).toLocaleString("en-IN")} sq ft ({r.areaType.replace(/_/g, " ")})</td>
                <td className="whitespace-nowrap text-xs">{formatInrFull(r.price)}</td>
                <td className="whitespace-nowrap text-xs">{formatInrFull(Math.round(r.price / r.areaSqft))}</td>
                <td className="max-w-48 text-xs text-muted">{r.source}<br />by {r.createdBy}</td>
                <td>
                  <form action={deleteComparableAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmButton message="Delete this comparable?" className="btn btn-sm text-danger">Delete</ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Card title="Add a verified transaction">
          <form action={addComparableAction} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="field-label">City</span><input name="city" required className="field" /></label>
              <label className="block"><span className="field-label">Locality</span><input name="locality" required className="field" /></label>
            </div>
            <label className="block">
              <span className="field-label">Property type</span>
              <select name="propertyType" className="field">{Object.entries(PROPERTY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="block"><span className="field-label">Area</span><input name="areaValue" required inputMode="decimal" className="field" /></label>
              <label className="block"><span className="field-label">Unit</span><select name="areaUnit" className="field">{Object.entries(AREA_UNITS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
              <label className="block"><span className="field-label">Type</span><select name="areaType" className="field">{Object.entries(AREA_TYPES).map(([k, v]) => <option key={k} value={k}>{v.replace(" area", "")}</option>)}</select></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="field-label">Sale price (₹)</span><input name="price" required className="field" placeholder="e.g. 1.25 Cr" /></label>
              <label className="block"><span className="field-label">Transaction date</span><input name="transactionDate" type="date" required className="field" /></label>
            </div>
            <label className="block"><span className="field-label">Source / evidence</span><input name="source" required className="field" placeholder="e.g. Our closed deal, ref. SKA-0912" /></label>
            <label className="block"><span className="field-label">Notes</span><input name="notes" className="field" /></label>
            <PendingButton>Add comparable</PendingButton>
          </form>
        </Card>
      </div>
    </>
  );
}
