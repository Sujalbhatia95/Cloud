import ExcelJS from "exceljs";

export const HEADERS = [
  "listing_id", "title", "transaction_type", "property_type", "listing_status", "price", "locality", "city", "state",
  "pincode", "bedrooms", "bathrooms", "area_value", "area_unit", "area_type", "furnishing_status", "description",
  "amenities", "image_urls", "featured", "rera_project_number", "last_updated",
];
export type Row = Record<string, string>;

const CITIES = [
  ["Kothrud", "Pune", "Maharashtra", "411038"],
  ["Powai", "Mumbai", "Maharashtra", "400076"],
  ["Indiranagar", "Bengaluru", "Karnataka", "560038"],
  ["Vaishali Nagar", "Jaipur", "Rajasthan", "302021"],
  ["Satellite", "Ahmedabad", "Gujarat", "380015"],
];

/** 30 realistic test listings (E2E-1 … E2E-30) for the weekly-upload tests. */
export function weeklyRows(): Row[] {
  return Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    const [locality, city, state, pincode] = CITIES[i % CITIES.length];
    const rent = n % 3 === 0;
    return {
      listing_id: `E2E-${n}`,
      title: `${(n % 4) + 1} BHK ${rent ? "home for rent" : "apartment"} in ${locality} #${n}`,
      transaction_type: rent ? "Rent" : "Sale",
      property_type: "Apartment",
      listing_status: "Active",
      price: rent ? `${20 + n},000` : `${50 + n * 5} Lakh`,
      locality,
      city,
      state,
      pincode,
      bedrooms: String((n % 4) + 1),
      bathrooms: String((n % 3) + 1),
      area_value: String(600 + n * 40),
      area_unit: "sqft",
      area_type: "Carpet",
      furnishing_status: ["Unfurnished", "Semi-furnished", "Fully furnished"][n % 3],
      description: `End-to-end test listing number ${n}.`,
      amenities: "Lift; Security",
      image_urls: "",
      featured: "No",
      rera_project_number: "",
      last_updated: "20-10-2026",
    };
  });
}

export function toCsv(rows: Row[], headers = HEADERS): Buffer {
  const cell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return Buffer.from([headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h] ?? "")).join(","))].join("\n"));
}

export async function toXlsx(rows: Row[], headerNames: Record<string, string>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("This week");
  ws.addRow(HEADERS.map((h) => headerNames[h] ?? h));
  for (const r of rows) ws.addRow(HEADERS.map((h) => r[h] ?? ""));
  return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

/** A date a few days ahead, in India Standard Time, formatted for <input type="date">. */
export function istDatePlus(days: number) {
  return new Date(Date.now() + 330 * 60_000 + days * 86_400_000).toISOString().slice(0, 10);
}
