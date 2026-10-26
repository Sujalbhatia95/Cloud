import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ListingForm } from "@/components/admin/ListingForm";
import { PageHeader } from "@/components/admin/ui";
import { getDb, schema } from "@/db";
import { requirePage } from "@/lib/auth/guards";
import { formatDateTimeIST } from "@/lib/listings/format";
import { listingPath } from "@/lib/listings/slug";
import { listingToRaw } from "@/lib/listings/to-raw";

export default async function EditListing({ params }: PageProps<"/admin/listings/[id]">) {
  await requirePage("listings:write");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [l] = await getDb().select().from(schema.listings).where(eq(schema.listings.id, id)).limit(1);
  if (!l) notFound();
  return (
    <>
      <PageHeader
        title={`Edit ${l.listingId}`}
        description={
          <>
            {l.isDemo ? <span className="badge badge-demo mr-2">Demo listing</span> : null}
            Last updated {formatDateTimeIST(l.updatedAt)} via {l.source}. The same rules as spreadsheet imports apply. Note: the next spreadsheet
            upload that contains this listing ID will overwrite these edits.
          </>
        }
        actions={<Link href={listingPath(l)} target="_blank" className="btn btn-outline btn-sm">View on website</Link>}
      />
      <ListingForm id={l.id} values={listingToRaw(l)} lockId />
    </>
  );
}
