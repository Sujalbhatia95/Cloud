/**
 * Downloadable spreadsheet templates (Admin → Imports → Download template).
 */
import ExcelJS from "exceljs";
import {
  AREA_TYPES,
  AREA_UNITS,
  FURNISHING,
  LISTING_STATUSES,
  POSSESSION,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from "@/lib/listings/constants";
import { LISTING_FIELDS, type ListingFieldKey } from "@/lib/listings/fields";
import { toCsv } from "./report";

const EXAMPLES: Partial<Record<ListingFieldKey, string>>[] = [
  {
    listing_id: "SKA-1001", title: "3 BHK apartment with garden view", transaction_type: "Sale", property_type: "Apartment",
    listing_status: "Active", price: "1.25 Cr", price_negotiable: "Yes", locality: "Baner", city: "Pune", state: "Maharashtra",
    pincode: "411045", bedrooms: "3", bathrooms: "3", area_value: "1250", area_unit: "sqft", area_type: "Carpet",
    furnishing_status: "Semi-furnished", possession_status: "Ready to move", floor: "7", total_floors: "14", parking: "1 covered",
    facing: "East", age_years: "4", maintenance_charges: "4500",
    description: "Example row — replace with your own listing.", amenities: "Lift; Gym; Swimming pool; Power backup",
    image_urls: "https://your-image-host.example/ska-1001/1.jpg | https://your-image-host.example/ska-1001/2.jpg",
    featured: "Yes", rera_project_number: "", last_updated: "25-10-2026",
  },
  {
    listing_id: "SKA-1002", title: "Furnished 2 BHK for rent near metro", transaction_type: "Rent", property_type: "Flat",
    listing_status: "Active", price: "32000", locality: "Andheri West", city: "Mumbai", state: "MH", pincode: "400058",
    bedrooms: "2", bathrooms: "2", area_value: "780", area_unit: "sq ft", area_type: "Carpet", furnishing_status: "Fully furnished",
    available_from: "01-12-2026", security_deposit: "1.5 Lakh", description: "Example row — replace with your own listing.",
    amenities: "Lift | Security | Parking", featured: "No", last_updated: "25-10-2026",
  },
  {
    listing_id: "SKA-1003", title: "Ground-floor retail shop on main road", transaction_type: "Lease", property_type: "Shop",
    listing_status: "Under offer", price: "85k", locality: "Civil Lines", city: "Jaipur", state: "Rajasthan", pincode: "302006",
    area_value: "450", area_unit: "sqft", area_type: "Built-up", description: "Example row — replace with your own listing.",
    featured: "No", last_updated: "25-10-2026",
  },
];

const DROPDOWNS: Partial<Record<ListingFieldKey, string[]>> = {
  transaction_type: Object.keys(TRANSACTION_TYPES).map(cap),
  property_type: Object.values(PROPERTY_TYPES).map((p) => p.label),
  listing_status: Object.values(LISTING_STATUSES).map((s) => s.replace(" (hidden)", "")),
  area_unit: Object.keys(AREA_UNITS),
  area_type: Object.values(AREA_TYPES).map((a) => a.replace(" area", "")),
  furnishing_status: Object.values(FURNISHING),
  possession_status: Object.values(POSSESSION),
  featured: ["Yes", "No"],
  price_negotiable: ["Yes", "No"],
};

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function buildTemplateXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Shree Krishna Associate website";
  wb.created = new Date();

  const navy = "FF0B1A4F";
  const ws = wb.addWorksheet("Listings", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = LISTING_FIELDS.map((f) => ({
    header: f.key,
    key: f.key,
    width: Math.max(14, Math.min(48, f.key.length + 6, f.example.length + 4)),
  }));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };
  header.height = 22;
  LISTING_FIELDS.forEach((f, i) => {
    const cell = header.getCell(i + 1);
    cell.note = `${f.label}${f.required ? " (required)" : ""}\n${f.help}`;
    if (f.required) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1230B8" } };
  });
  // Text format for ID / PIN / date columns so Excel does not strip leading zeros or reformat values.
  for (const key of ["listing_id", "pincode", "last_updated", "available_from", "rera_project_number"] as const) {
    ws.getColumn(key).numFmt = "@";
  }

  // Hidden sheet holding dropdown values
  const lists = wb.addWorksheet("Lists", { state: "hidden" });
  let col = 1;
  for (const [key, values] of Object.entries(DROPDOWNS)) {
    lists.getCell(1, col).value = key;
    values.forEach((v, r) => (lists.getCell(r + 2, col).value = v));
    const letter = lists.getColumn(col).letter;
    const range = `Lists!$${letter}$2:$${letter}$${values.length + 1}`;
    const target = ws.getColumn(key).letter;
    for (let r = 2; r <= 1000; r++) {
      ws.getCell(`${target}${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [range],
        showErrorMessage: false, // synonyms such as "Flat" or "Lease" are still accepted by the importer
      };
    }
    col++;
  }

  const ex = wb.addWorksheet("Examples");
  ex.columns = LISTING_FIELDS.map((f) => ({ header: f.key, key: f.key, width: 18 }));
  ex.getRow(1).font = { bold: true };
  EXAMPLES.forEach((row) => ex.addRow(row));
  ex.addRow([]);
  ex.addRow(["These rows are examples only. Put your real listings on the \"Listings\" sheet (the importer reads that sheet by default)."]);

  const help = wb.addWorksheet("Instructions");
  help.columns = [
    { header: "Column", key: "key", width: 22 },
    { header: "Required?", key: "req", width: 11 },
    { header: "What to enter", key: "help", width: 90 },
    { header: "Example", key: "example", width: 34 },
  ];
  help.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  help.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };
  LISTING_FIELDS.forEach((f) => help.addRow({ key: f.key, req: f.required ? "Yes" : "", help: f.help, example: f.example }));
  help.getColumn("help").alignment = { wrapText: true, vertical: "top" };
  help.addRow({});
  for (const line of [
    "HOW WEEKLY UPLOADS WORK",
    "• Each row is matched to the website using listing_id. Same ID = update that listing; new ID = new listing. Duplicates are never created.",
    "• Listings that are missing from your file are NOT deleted. To remove a listing from the website, set listing_status to Archived, Sold or Rented.",
    "• You will see a preview (added / updated / unchanged / skipped / rejected) and must press Confirm before anything changes.",
    "• If the import fails part-way, nothing is changed. Rejected rows are listed with reasons in a downloadable error report.",
    "• Column names do not have to match exactly — you can map your own column names on the upload screen.",
    "• Only use photos you own or are licensed to use, and only advertise properties you are authorised to market.",
    "• Never invent RERA numbers. Copy them exactly from the State RERA website or leave the cell blank.",
  ]) {
    const r = help.addRow({ key: line });
    help.mergeCells(`A${r.number}:D${r.number}`);
    if (line === line.toUpperCase()) r.font = { bold: true };
  }

  wb.views = [{ activeTab: 0, x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, visibility: "visible" }];
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

export function buildTemplateCsv(withExamples: boolean): string {
  const headers = LISTING_FIELDS.map((f) => f.key);
  const rows = withExamples ? EXAMPLES.map((e) => headers.map((h) => e[h as ListingFieldKey] ?? "")) : [];
  return toCsv([headers, ...rows]);
}
