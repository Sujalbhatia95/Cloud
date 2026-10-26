/**
 * Acceptance tests 1–4: CSV/Excel uploads, no duplicates on repeat uploads, updates replace
 * matching records, and invalid / failed imports never corrupt existing data.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import * as XLSX from "@e965/xlsx";
import { asc, eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { cancelBatch, commitBatch, createBatch, previewBatch } from "@/lib/import/commit";
import { ImportFileError } from "@/lib/import/parse-file";
import { buildTemplateXlsx } from "@/lib/import/template";
import { createTestAdmin, db, resetDb } from "../support/db";

const HEADERS = [
  "listing_id", "title", "transaction_type", "property_type", "listing_status", "price", "locality", "city", "state",
  "pincode", "bedrooms", "bathrooms", "area_value", "area_unit", "area_type", "furnishing_status", "description",
  "amenities", "image_urls", "featured", "rera_project_number", "last_updated",
];
type Row = Record<string, string>;
const ROWS: Row[] = [
  { listing_id: "SKA-1", title: "3 BHK apartment in Baner", transaction_type: "Sale", property_type: "Apartment", listing_status: "Active", price: "1.25 Cr", locality: "Baner", city: "Pune", state: "Maharashtra", pincode: "411045", bedrooms: "3", bathrooms: "3", area_value: "1250", area_unit: "sqft", area_type: "Carpet", furnishing_status: "Semi-furnished", description: "Corner flat", amenities: "Lift; Gym", image_urls: "https://img.example.com/1.jpg", featured: "Yes", rera_project_number: "", last_updated: "20-10-2026" },
  { listing_id: "SKA-2", title: "2 BHK for rent in Andheri", transaction_type: "Rent", property_type: "Flat", listing_status: "Active", price: "45,000", locality: "Andheri West", city: "Mumbai", state: "MH", pincode: "400058", bedrooms: "2", bathrooms: "2", area_value: "780", area_unit: "sq ft", area_type: "Carpet", furnishing_status: "Furnished", description: "Near metro", amenities: "Security", image_urls: "", featured: "No", rera_project_number: "", last_updated: "20-10-2026" },
  { listing_id: "SKA-3", title: "Retail shop on MI Road", transaction_type: "Lease", property_type: "Shop", listing_status: "Active", price: "85k", locality: "MI Road", city: "Jaipur", state: "Rajasthan", pincode: "302001", bedrooms: "", bathrooms: "1", area_value: "450", area_unit: "sqft", area_type: "Built-up", furnishing_status: "", description: "Main road frontage", amenities: "", image_urls: "", featured: "No", rera_project_number: "", last_updated: "20-10-2026" },
];

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
function csv(rows: Row[], headers = HEADERS): Buffer {
  return Buffer.from([headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h] ?? "")).join(","))].join("\n"));
}

async function xlsx(rows: Row[], headers: string[], map: (h: string) => string = (h) => h, titleRows: string[] = []) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("My Listings");
  for (const t of titleRows) ws.addRow([t]);
  ws.addRow(headers.map(map));
  for (const r of rows) ws.addRow(headers.map((h) => r[h] ?? ""));
  return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

function xls(rows: Row[]): Buffer {
  const aoa = [HEADERS, ...rows.map((r) => HEADERS.map((h) => r[h] ?? ""))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "biff8" }) as Buffer;
}

let actor: { id: string; email: string };

async function runImport(name: string, data: Buffer, opts: { strict?: boolean; failAfterWrites?: number } = {}) {
  const { id } = await createBatch(db(), { name, data }, actor);
  const [batch] = await db().select().from(schema.importBatches).where(eq(schema.importBatches.id, id));
  const preview = await previewBatch(db(), id, batch.mapping!);
  const result = await commitBatch(db(), id, actor, opts);
  return { id, preview, result };
}

async function snapshot() {
  return db().select().from(schema.listings).orderBy(asc(schema.listings.listingId));
}

beforeAll(async () => {
  await resetDb();
});
beforeEach(async () => {
  await resetDb();
  actor = await createTestAdmin();
});

describe("spreadsheet imports", () => {
  it("imports a CSV file and stores normalised values", async () => {
    const { preview, result } = await runImport("weekly.csv", csv(ROWS));
    expect(result.ok).toBe(true);
    expect(preview.summary).toMatchObject({ added: 3, updated: 0, unchanged: 0, rejected: 0 });
    const rows = await snapshot();
    expect(rows.map((r) => r.listingId)).toEqual(["SKA-1", "SKA-2", "SKA-3"]);
    expect(rows[0]).toMatchObject({ price: 12_500_000, city: "Pune", featured: true, transactionType: "sale", category: "residential" });
    expect(rows[1]).toMatchObject({ price: 45_000, state: "Maharashtra", transactionType: "rent", propertyType: "apartment", furnishingStatus: "fully_furnished" });
    expect(rows[2]).toMatchObject({ price: 85_000, transactionType: "rent", category: "commercial" });
  });

  it("repeated uploads of the same file do not create duplicates", async () => {
    await runImport("weekly.csv", csv(ROWS));
    const second = await runImport("weekly.csv", csv(ROWS));
    expect(second.result.ok).toBe(true);
    expect(second.preview.summary).toMatchObject({ added: 0, updated: 0, unchanged: 3 });
    const third = await runImport("weekly.xlsx", await xlsx(ROWS, HEADERS));
    expect(third.preview.summary).toMatchObject({ added: 0, updated: 0, unchanged: 3 });
    const [{ count }] = await db().select({ count: sql<number>`count(*)::int` }).from(schema.listings);
    expect(count).toBe(3);
  });

  it("updates matching listings, adds new ones and never deletes missing ones", async () => {
    await runImport("week1.csv", csv(ROWS));
    const before = await snapshot();
    const week2 = [
      { ...ROWS[0], price: "1.3 Cr", listing_status: "Under offer", last_updated: "24-10-2026" },
      { ...ROWS[1] },
      { ...ROWS[0], listing_id: "SKA-4", title: "Villa with private pool", property_type: "Villa", price: "4.5 Cr" },
      // SKA-3 is missing from this week's file
    ];
    const { preview, result } = await runImport("week2.csv", csv(week2));
    expect(result.ok).toBe(true);
    expect(preview.summary).toMatchObject({ added: 1, updated: 1, unchanged: 1, rejected: 0 });
    expect(preview.notInFile).toBe(1);
    const updatedRow = preview.results.find((r) => r.listingId === "SKA-1")!;
    expect(updatedRow.changedFields.sort()).toEqual(["listingStatus", "price"]);

    const after = await snapshot();
    expect(after.map((r) => r.listingId)).toEqual(["SKA-1", "SKA-2", "SKA-3", "SKA-4"]);
    const ska1 = after.find((r) => r.listingId === "SKA-1")!;
    expect(ska1.price).toBe(13_000_000);
    expect(ska1.listingStatus).toBe("under_offer");
    expect(ska1.id).toBe(before.find((r) => r.listingId === "SKA-1")!.id); // same record, updated in place
    expect(after.find((r) => r.listingId === "SKA-3")).toEqual(before.find((r) => r.listingId === "SKA-3")); // untouched
  });

  it("imports .xlsx files with the user's own column names and a title row", async () => {
    const custom: Record<string, string> = {
      listing_id: "Property ID", title: "Property Name", transaction_type: "Sale/Rent", property_type: "Property Type",
      listing_status: "Status", price: "Expected Price (₹)", locality: "Location", city: "City", state: "State",
      pincode: "Pin Code", bedrooms: "BHK", bathrooms: "Bathrooms", area_value: "Area (Sq.Ft.)", area_unit: "Unit",
      area_type: "Area Type", furnishing_status: "Furnishing", description: "Remarks", amenities: "Amenities",
      image_urls: "Photos", featured: "Featured", rera_project_number: "RERA No", last_updated: "Updated On",
    };
    const file = await xlsx(ROWS, HEADERS, (h) => custom[h], ["SHREE KRISHNA ASSOCIATE — LISTINGS OCT 2026"]);
    const { id } = await createBatch(db(), { name: "My Sheet.xlsx", data: file }, actor);
    const [batch] = await db().select().from(schema.importBatches).where(eq(schema.importBatches.id, id));
    expect(batch.headerRow).toBe(2);
    for (const key of HEADERS) expect(batch.mapping?.[key as keyof typeof batch.mapping], `mapping for ${key}`).toBe(HEADERS.indexOf(key));
    await previewBatch(db(), id, batch.mapping!);
    const result = await commitBatch(db(), id, actor);
    expect(result.ok).toBe(true);
    expect((await snapshot()).length).toBe(3);
  });

  it("imports legacy .xls files", async () => {
    const { preview, result } = await runImport("old.xls", xls(ROWS));
    expect(result.ok).toBe(true);
    expect(preview.summary.added).toBe(3);
    const rows = await snapshot();
    expect(rows[0].pincode).toBe("411045");
    expect(rows[0].price).toBe(12_500_000);
  });

  it("imports the downloadable template after filling the Listings sheet", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await buildTemplateXlsx()) as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Listings")!;
    const templateHeaders = (ws.getRow(1).values as string[]).slice(1);
    ROWS.forEach((r, i) => {
      // Type into rows 2-4 as a person would (the template pre-formats rows with dropdowns)
      templateHeaders.forEach((h, c) => (ws.getRow(i + 2).getCell(c + 1).value = r[h] ?? ""));
    });
    // Examples sheet must be ignored by default
    const buf = Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
    const { preview, result } = await runImport("template.xlsx", buf);
    expect(result.ok).toBe(true);
    expect(preview.summary.added).toBe(3);
  });

  it("rejects invalid rows with reasons and leaves existing data untouched", async () => {
    await runImport("week1.csv", csv(ROWS));
    const before = await snapshot();
    const bad = [
      { ...ROWS[0], price: "lots", title: "x" }, // invalid update for existing listing
      { ...ROWS[1], listing_id: "", title: "No id" },
      { ...ROWS[2], listing_id: "SKA-9", city: "", pincode: "12" },
      { ...ROWS[2], listing_id: "SKA-9" }, // duplicate id in the same file
      { ...ROWS[2], listing_id: "SKA-10", title: "Valid new office", property_type: "Office" },
    ];
    const { preview, result } = await runImport("bad.csv", csv(bad));
    expect(result.ok).toBe(true);
    expect(preview.summary).toMatchObject({ added: 1, rejected: 4, updated: 0 });
    expect(preview.results.find((r) => r.row === 5)?.errors.join()).toMatch(/Duplicate listing_id — it already appears on row 4/);
    const errs = preview.results.filter((r) => r.outcome === "rejected").flatMap((r) => r.errors).join("\n");
    expect(errs).toMatch(/price "lots" is not a valid amount/);
    expect(errs).toMatch(/listing_id is required/);
    expect(errs).toMatch(/city is required/);
    expect(errs).toMatch(/6-digit/);
    expect(errs).toMatch(/Duplicate listing_id/);
    const after = await snapshot();
    expect(after.filter((r) => r.listingId !== "SKA-10")).toEqual(before);
  });

  it("strict mode imports nothing when any row is invalid", async () => {
    await runImport("week1.csv", csv(ROWS));
    const before = await snapshot();
    const { result } = await runImport("mixed.csv", csv([{ ...ROWS[0], price: "1.4 Cr" }, { ...ROWS[1], price: "???" }]), { strict: true });
    expect(result.ok).toBe(false);
    expect(await snapshot()).toEqual(before);
  });

  it("rolls back completely if the import fails part-way", async () => {
    await runImport("week1.csv", csv(ROWS));
    const before = await snapshot();
    const changes = [
      { ...ROWS[0], price: "2 Cr" },
      { ...ROWS[1], price: "50,000" },
      { ...ROWS[2], listing_id: "SKA-50" },
    ];
    const { id, result } = await runImport("week2.csv", csv(changes), { failAfterWrites: 2 });
    expect(result.ok).toBe(false);
    expect(await snapshot()).toEqual(before);
    const [batch] = await db().select().from(schema.importBatches).where(eq(schema.importBatches.id, id));
    expect(batch.status).toBe("failed");
    expect(batch.error).toMatch(/rolled back/);
  });

  it("cannot confirm the same import twice, or a cancelled import", async () => {
    const { id } = await runImport("week1.csv", csv(ROWS));
    const again = await commitBatch(db(), id, actor);
    expect(again.ok).toBe(false);
    const second = await createBatch(db(), { name: "x.csv", data: csv(ROWS) }, actor);
    await cancelBatch(db(), second.id);
    await expect(previewBatch(db(), second.id, { listing_id: 0 })).rejects.toThrow(/cancelled/);
  });

  it("skips rows older than the version already on the website", async () => {
    await runImport("week1.csv", csv(ROWS));
    const { preview } = await runImport("old.csv", csv([{ ...ROWS[0], price: "99 Lakh", last_updated: "01-01-2026" }]));
    expect(preview.summary).toMatchObject({ skipped: 1, updated: 0 });
    const [row] = await db().select().from(schema.listings).where(eq(schema.listings.listingId, "SKA-1"));
    expect(row.price).toBe(12_500_000);
  });

  it("refuses unsafe or unsupported files", async () => {
    await expect(createBatch(db(), { name: "evil.exe", data: Buffer.from("MZ") }, actor)).rejects.toBeInstanceOf(ImportFileError);
    await expect(createBatch(db(), { name: "fake.xlsx", data: Buffer.from("hello,world") }, actor)).rejects.toThrow(/does not look like an Excel file/);
    await expect(createBatch(db(), { name: "big.csv", data: Buffer.alloc(5 * 1024 * 1024, 65) }, actor)).rejects.toThrow(/larger than/);
    const zipNoDir = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(100)]);
    await expect(createBatch(db(), { name: "broken.xlsx", data: zipNoDir }, actor)).rejects.toThrow(/not a valid .xlsx/);
  });

  it("neutralises spreadsheet formulas (uses cached values, never evaluates)", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Listings");
    ws.addRow(HEADERS);
    const r = ws.addRow(HEADERS.map((h) => ROWS[0][h] ?? ""));
    r.getCell(HEADERS.indexOf("price") + 1).value = { formula: "1000000*12.5", result: 12_500_000 };
    r.getCell(HEADERS.indexOf("description") + 1).value = { formula: 'HYPERLINK("http://evil","x")', result: "Plain text" };
    const buf = Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
    const { result } = await runImport("formula.xlsx", buf);
    expect(result.ok).toBe(true);
    const [row] = await snapshot();
    expect(row.price).toBe(12_500_000);
    expect(row.description).toBe("Plain text");
  });
});
