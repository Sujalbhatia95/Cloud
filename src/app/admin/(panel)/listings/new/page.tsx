import { ListingForm } from "@/components/admin/ListingForm";
import { PageHeader } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";

export default async function NewListing() {
  await requirePage("listings:write");
  return (
    <>
      <PageHeader title="Add a listing" description="For one-off additions. For many listings, upload a spreadsheet instead." />
      <ListingForm values={{ listing_status: "draft", transaction_type: "sale", property_type: "apartment", featured: "no", price_negotiable: "no" }} lockId={false} />
    </>
  );
}
