import type { Listing } from "@/db/schema";
import type { ListingFieldKey } from "./fields";

/** Converts a stored listing back into spreadsheet-style text values (for the admin edit form). */
export function listingToRaw(l: Listing): Partial<Record<ListingFieldKey, string>> {
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return {
    listing_id: l.listingId,
    title: l.title,
    transaction_type: l.transactionType,
    property_type: l.propertyType,
    listing_status: l.listingStatus,
    price: l.price === null ? "Price on request" : String(l.price),
    price_negotiable: l.priceNegotiable ? "yes" : "no",
    locality: l.locality,
    city: l.city,
    state: l.state,
    pincode: s(l.pincode),
    bedrooms: s(l.bedrooms),
    bathrooms: s(l.bathrooms),
    area_value: s(l.areaValue),
    area_unit: s(l.areaUnit),
    area_type: s(l.areaType),
    furnishing_status: s(l.furnishingStatus),
    possession_status: s(l.possessionStatus),
    available_from: s(l.availableFrom),
    floor: s(l.floor),
    total_floors: s(l.totalFloors),
    parking: s(l.parking),
    facing: s(l.facing),
    age_years: s(l.ageYears),
    maintenance_charges: s(l.maintenanceCharges),
    security_deposit: s(l.securityDeposit),
    description: s(l.description),
    amenities: l.amenities.join("\n"),
    image_urls: l.imageUrls.join("\n"),
    featured: l.featured ? "yes" : "no",
    rera_project_number: s(l.reraProjectNumber),
  };
}
