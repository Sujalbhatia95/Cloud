/**
 * Seeds default settings and clearly-labelled DEMO listings (IDs start with "DEMO-", is_demo = true).
 * Demo images in /public/demo are licensed stock photographs (see docs/IMAGE_CREDITS.md).
 * Safe to run repeatedly: demo listings are upserted by listing_id; real listings are never touched.
 * Usage: pnpm db:seed
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { poolConfigFromEnv } from "../src/db/config";
import { contentHash, validateListingRow } from "../src/lib/listings/validate";
import type { ListingFieldKey } from "../src/lib/listings/fields";

const NOTE = "DEMO LISTING — this is a fictional sample property created to demonstrate the website. The price, location and details are not real, and the photos are stock photographs that do not show this property.";

type Row = Partial<Record<ListingFieldKey, string>>;
const img = (...names: string[]) => names.map((n) => `/demo/${n}.jpg`).join(" | ");

export const DEMO_LISTINGS: (Row & { daysAgo: number })[] = [
  {
    listing_id: "DEMO-101", title: "Contemporary 4 BHK villa with private pool", transaction_type: "Sale", property_type: "Villa",
    listing_status: "Active", price: "4.85 Cr", price_negotiable: "Yes", locality: "Kalyani Nagar", city: "Pune", state: "Maharashtra", pincode: "411006",
    bedrooms: "4", bathrooms: "5", area_value: "4200", area_unit: "sqft", area_type: "Built-up", furnishing_status: "Fully furnished",
    possession_status: "Ready to move", total_floors: "2", parking: "3 covered", facing: "East", age_years: "2", maintenance_charges: "12000",
    description: `${NOTE}\n\nA two-storey contemporary villa arranged around a landscaped garden and a 13-metre pool. Floor-to-ceiling glazing opens the living and dining spaces to the deck, while the upper floor holds four bedroom suites with a private terrace.\n\nWarm timber cladding, deep roof overhangs and cross-ventilated rooms keep the home comfortable through the summer.`,
    amenities: "Private swimming pool; Landscaped garden; Home automation; Power backup; Solar water heating; 3 covered parking; Servant quarters; CCTV",
    image_urls: img("villa-1", "villa-2", "villa-3", "living-1", "kitchen-1", "bedroom-1"), featured: "Yes", daysAgo: 3,
  },
  {
    listing_id: "DEMO-102", title: "3 BHK apartment with garden views", transaction_type: "Sale", property_type: "Apartment",
    listing_status: "Active", price: "1.65 Cr", locality: "Baner", city: "Pune", state: "Maharashtra", pincode: "411045",
    bedrooms: "3", bathrooms: "3", area_value: "1180", area_unit: "sqft", area_type: "Carpet", furnishing_status: "Semi-furnished",
    possession_status: "Ready to move", floor: "9", total_floors: "15", parking: "2 covered", facing: "North-East", age_years: "4", maintenance_charges: "5500",
    description: `${NOTE}\n\nA bright corner apartment on the ninth floor with balconies on two sides overlooking the podium garden. The open kitchen connects to a generous living room, and all three bedrooms have attached bathrooms.`,
    amenities: "Lift; Gymnasium; Swimming pool; Clubhouse; Children's play area; 24×7 security; Power backup; Rainwater harvesting",
    image_urls: img("apartment-1", "living-2", "kitchen-1", "bedroom-1", "apartment-2"), featured: "Yes", daysAgo: 6,
  },
  {
    listing_id: "DEMO-103", title: "Furnished 2 BHK near the metro station", transaction_type: "Rent", property_type: "Flat",
    listing_status: "Active", price: "48,000", locality: "Andheri West", city: "Mumbai", state: "Maharashtra", pincode: "400058",
    bedrooms: "2", bathrooms: "2", area_value: "760", area_unit: "sqft", area_type: "Carpet", furnishing_status: "Fully furnished",
    available_from: "15-11-2026", floor: "6", total_floors: "12", parking: "1 covered", security_deposit: "2.5 Lakh", maintenance_charges: "4000",
    description: `${NOTE}\n\nA fully furnished two-bedroom home a short walk from the metro, with modular kitchen, air-conditioning in every room and a quiet, tree-lined approach.`,
    amenities: "Lift; Security; Air-conditioning; Modular kitchen; Covered parking; Power backup",
    image_urls: img("living-3", "bedroom-1", "kitchen-1", "apartment-3"), featured: "No", daysAgo: 1,
  },
  {
    listing_id: "DEMO-104", title: "Grade-A office floor with open-plan workspace", transaction_type: "Lease", property_type: "Office Space",
    listing_status: "Active", price: "3.2 Lakh", locality: "Sector 62", city: "Noida", state: "UP", pincode: "201309",
    bathrooms: "4", area_value: "6500", area_unit: "sqft", area_type: "Super built-up", furnishing_status: "Fully furnished",
    possession_status: "Ready to move", floor: "5", total_floors: "10", parking: "12 reserved", security_deposit: "19.2 Lakh", maintenance_charges: "45000",
    description: `${NOTE}\n\nA full office floor with 72 workstations, two meeting rooms, a pantry and generous natural light from a glazed façade. Suitable for technology and professional-services teams.`,
    amenities: "Central air-conditioning; 100% power backup; High-speed lifts; Cafeteria; Fire safety systems; Visitor parking",
    image_urls: img("office-1", "office-2"), featured: "Yes", daysAgo: 9,
  },
  {
    listing_id: "DEMO-105", title: "High-street retail shop with wide frontage", transaction_type: "Sale", property_type: "Shop",
    listing_status: "Active", price: "2.4 Cr", locality: "C-Scheme", city: "Jaipur", state: "Rajasthan", pincode: "302001",
    bathrooms: "1", area_value: "650", area_unit: "sqft", area_type: "Built-up", furnishing_status: "Unfurnished", possession_status: "Ready to move",
    floor: "Ground", total_floors: "3", parking: "Street parking", facing: "North",
    description: `${NOTE}\n\nA ground-floor shop on a busy shopping street, with a full-height glazed frontage, mezzanine storage and an awning.`,
    amenities: "Main road frontage; Mezzanine storage; Three-phase power; Washroom",
    image_urls: img("shop-1", "shop-2"), featured: "No", daysAgo: 12,
  },
  {
    listing_id: "DEMO-106", title: "Corner residential plot in a gated layout", transaction_type: "Sale", property_type: "Plot",
    listing_status: "Active", price: "95 Lakh", locality: "Chhatikara Road", city: "Vrindavan", state: "Uttar Pradesh", pincode: "281121",
    area_value: "200", area_unit: "sq yd", area_type: "Plot", facing: "East",
    description: `${NOTE}\n\nA corner plot with roads on two sides inside a gated layout with internal roads and boundary fencing.`,
    amenities: "Gated layout; Corner plot; Internal roads; Boundary wall",
    image_urls: img("plot-1", "plot-2"), featured: "No", daysAgo: 15,
  },
  {
    listing_id: "DEMO-107", title: "3 BHK in a new residential tower (under construction)", transaction_type: "Sale", property_type: "Apartment",
    listing_status: "Active", price: "1.12 Cr", locality: "Gota", city: "Ahmedabad", state: "Gujarat", pincode: "382481",
    bedrooms: "3", bathrooms: "3", area_value: "1050", area_unit: "sqft", area_type: "Carpet", furnishing_status: "Unfurnished",
    possession_status: "Under construction", available_from: "31-12-2028", floor: "11", total_floors: "18", parking: "1 covered",
    description: `${NOTE}\n\nShows how an under-construction project appears. Real projects of this kind must display their RERA project registration number — here the placeholder is shown instead.`,
    amenities: "Lift; Clubhouse; Gymnasium; Jogging track; Children's play area",
    image_urls: img("apartment-2", "living-1", "kitchen-1"), featured: "No", rera_project_number: "", daysAgo: 4,
  },
  {
    listing_id: "DEMO-108", title: "Warehouse with five loading docks", transaction_type: "Rent", property_type: "Godown",
    listing_status: "Active", price: "6.5 Lakh", locality: "Bhiwandi", city: "Thane", state: "Maharashtra", pincode: "421302",
    bathrooms: "2", area_value: "40000", area_unit: "sqft", area_type: "Built-up", possession_status: "Ready to move", parking: "Truck yard",
    security_deposit: "39 Lakh",
    description: `${NOTE}\n\nA clear-span warehouse with 10-metre eaves height, five docks with canopies, a two-storey office block and a paved truck yard.`,
    amenities: "Five loading docks; Truck yard; 24×7 security; Fire hydrant system; Office block",
    image_urls: img("warehouse-1"), featured: "No", daysAgo: 20,
  },
  {
    listing_id: "DEMO-109", title: "Penthouse with private terrace", transaction_type: "Sale", property_type: "Penthouse",
    listing_status: "Under offer", price: "3.9 Cr", locality: "Gomti Nagar", city: "Lucknow", state: "Uttar Pradesh", pincode: "226010",
    bedrooms: "4", bathrooms: "4", area_value: "3100", area_unit: "sqft", area_type: "Super built-up", furnishing_status: "Semi-furnished",
    possession_status: "Ready to move", floor: "15", total_floors: "15", parking: "2 covered",
    description: `${NOTE}\n\nShows how a property "under offer" appears: it is hidden from default search results and only listed when visitors choose to include properties under offer.`,
    amenities: "Private terrace; Lift; Clubhouse; Power backup",
    image_urls: img("apartment-3", "living-3", "bedroom-1"), featured: "No", daysAgo: 25,
  },
  {
    listing_id: "DEMO-110", title: "Studio apartment for working professionals", transaction_type: "Rent", property_type: "Studio",
    listing_status: "Active", price: "18,000", locality: "Whitefield", city: "Bengaluru", state: "Karnataka", pincode: "560066",
    bedrooms: "1", bathrooms: "1", area_value: "420", area_unit: "sqft", area_type: "Carpet", furnishing_status: "Fully furnished",
    available_from: "01-11-2026", floor: "3", total_floors: "8", security_deposit: "1 Lakh",
    description: `${NOTE}\n\nA compact, fully furnished studio with a kitchenette and a work desk, close to the IT corridor.`,
    amenities: "Lift; Wi-Fi ready; Housekeeping; Security",
    image_urls: img("living-2", "kitchen-1"), featured: "No", daysAgo: 2,
  },
  {
    listing_id: "DEMO-111", title: "Archived demo listing (never shown publicly)", transaction_type: "Sale", property_type: "Apartment",
    listing_status: "Archived", price: "75 Lakh", locality: "Baner", city: "Pune", state: "Maharashtra", pincode: "411045",
    bedrooms: "2", bathrooms: "2", area_value: "850", area_unit: "sqft", area_type: "Carpet",
    description: `${NOTE}\n\nUsed to verify that archived listings never appear on the public website.`,
    image_urls: img("apartment-1"), featured: "Yes", daysAgo: 40,
  },
  {
    listing_id: "DEMO-112", title: "Sold demo listing (shown as no longer available)", transaction_type: "Sale", property_type: "Independent House",
    listing_status: "Sold", price: "2.1 Cr", locality: "Kalyani Nagar", city: "Pune", state: "Maharashtra", pincode: "411006",
    bedrooms: "3", bathrooms: "3", area_value: "2400", area_unit: "sqft", area_type: "Built-up",
    description: `${NOTE}\n\nUsed to verify that sold properties are excluded from search and their page says they are no longer available.`,
    image_urls: img("villa-2"), featured: "No", daysAgo: 60,
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ ...poolConfigFromEnv(url), max: 2 });
  const db = drizzle(pool, { schema });
  try {
    await db.insert(schema.siteSettings).values({ id: 1, data: { demoMode: true }, updatedBy: "seed" }).onConflictDoNothing();
    let n = 0;
    for (const { daysAgo, ...raw } of DEMO_LISTINGS) {
      const v = validateListingRow(raw, new Date(), { allowDemoIds: true });
      if (!v.listing) throw new Error(`Demo listing ${raw.listing_id} is invalid: ${v.errors.join("; ")}`);
      const created = new Date(Date.now() - daysAgo * 86_400_000);
      const values = { ...v.listing, contentHash: contentHash(v.listing), isDemo: true, source: "seed", createdAt: created, updatedAt: created };
      await db
        .insert(schema.listings)
        .values(values)
        .onConflictDoUpdate({ target: schema.listings.listingId, set: { ...values }, setWhere: sql`${schema.listings.isDemo} = true` });
      n++;
    }
    console.log(`✓ Seeded settings and ${n} demo listings (all marked DEMO).`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
