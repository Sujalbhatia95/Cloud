import { describe, expect, it } from "vitest";
import { changedFields, contentHash, validateListingRow } from "@/lib/listings/validate";

const base = {
  listing_id: "SKA-1",
  title: "3 BHK Apartment near the park",
  transaction_type: "Sale",
  property_type: "Apartment",
  listing_status: "Active",
  price: "1.2 Cr",
  locality: "baner",
  city: "PUNE",
  state: "MH",
  pincode: "411045",
  bedrooms: "3 BHK",
  bathrooms: "2",
  area_value: "1250",
  area_unit: "sq ft",
  area_type: "Carpet",
  description: "Nice",
  image_urls: "https://cdn.example.com/a.jpg",
};

describe("validateListingRow", () => {
  it("normalises a valid row", () => {
    const r = validateListingRow(base);
    expect(r.errors).toEqual([]);
    expect(r.listing).toMatchObject({
      listingId: "SKA-1",
      price: 12_000_000,
      locality: "Baner",
      city: "Pune",
      state: "Maharashtra",
      bedrooms: 3,
      areaSqft: 1250,
      category: "residential",
    });
  });
  it("reports every missing required field", () => {
    const r = validateListingRow({ listing_id: "X1" });
    expect(r.listing).toBeNull();
    expect(r.errors.join("\n")).toMatch(/title is required/);
    expect(r.errors.join("\n")).toMatch(/price is required/);
    expect(r.errors.join("\n")).toMatch(/city is required/);
  });
  it("converts area units to square feet", () => {
    const r = validateListingRow({ ...base, area_value: "200", area_unit: "sq yd" });
    expect(r.listing?.areaSqft).toBe(1800);
  });
  it("warns (not rejects) about missing RERA number for under-construction sale", () => {
    const r = validateListingRow({ ...base, possession_status: "Under construction" });
    expect(r.errors).toEqual([]);
    expect(r.warnings.join(" ")).toMatch(/RERA/);
  });
  it("reserves DEMO- ids", () => {
    expect(validateListingRow({ ...base, listing_id: "DEMO-9" }).errors.join()).toMatch(/reserved/);
  });
  it("hash is stable and detects changes", () => {
    const a = validateListingRow(base).listing!;
    const b = validateListingRow({ ...base }).listing!;
    expect(contentHash(a)).toBe(contentHash(b));
    const c = validateListingRow({ ...base, price: "1.3 Cr" }).listing!;
    expect(contentHash(c)).not.toBe(contentHash(a));
    expect(changedFields(a as unknown as Record<string, unknown>, c)).toEqual(["price"]);
  });
});
