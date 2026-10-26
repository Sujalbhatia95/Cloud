/**
 * Acceptance tests 1–4 through the real admin UI:
 * CSV and Excel uploads work, repeat uploads create no duplicates, updates replace matching
 * records and appear on the live site, invalid imports leave existing data untouched.
 */
import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import { db, expect, login, test } from "./fixtures";
import { toCsv, toXlsx, weeklyRows } from "./helpers";

async function upload(page: import("@playwright/test").Page, name: string, buffer: Buffer, mimeType: string) {
  await page.goto("/admin/imports");
  await page.locator('input[type="file"][name="file"]').setInputFiles({ name, mimeType, buffer });
  await page.getByRole("button", { name: "Upload and map columns" }).click();
}

async function previewAndConfirm(page: import("@playwright/test").Page, expectPreview: RegExp, opts: { strict?: boolean } = {}) {
  await page.waitForURL(/\/admin\/imports\/[0-9a-f-]{36}/);
  await page.getByRole("button", { name: "Validate & preview" }).click();
  await expect(page.getByRole("status")).toContainText(expectPreview);
  if (opts.strict) await page.getByLabel(/Only import if every row is valid/).check();
  await page.getByLabel(/I have reviewed the preview/).check();
  await page.getByRole("button", { name: "Confirm import" }).click();
}

async function snapshot() {
  return (await db().query("select listing_id, price, listing_status, title, updated_at from listings where not is_demo order by listing_id")).rows;
}

test.describe.serial("weekly spreadsheet uploads", () => {
  test("downloadable templates are available to signed-in staff", async ({ page }) => {
    await login(page);
    await page.goto("/admin/imports");
    const [xlsx] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Excel template/ }).click()]);
    expect(xlsx.suggestedFilename()).toBe("shree-krishna-listings-template.xlsx");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await readFile((await xlsx.path())!)) as unknown as ArrayBuffer);
    const headers = (wb.getWorksheet("Listings")!.getRow(1).values as string[]).slice(1);
    expect(headers).toContain("listing_id");
    expect(headers).toContain("rera_project_number");
    expect(wb.getWorksheet("Instructions")).toBeTruthy();
    const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /CSV template/ }).click()]);
    expect((await readFile((await csv.path())!, "utf8")).split("\n")[0]).toContain("listing_id,title,transaction_type");
  });

  test("CSV upload: map, preview, confirm — listings go live", async ({ page }) => {
    await login(page);
    await upload(page, "weekly-listings.csv", toCsv(weeklyRows()), "text/csv");
    await previewAndConfirm(page, /30 to add, 0 to update/);
    await expect(page.getByRole("status")).toContainText("Import complete: 30 added");
    expect((await snapshot()).length).toBe(30);

    await page.goto("/buy?q=E2E-5");
    await expect(page.getByRole("heading", { name: /apartment in Satellite #5/ })).toBeVisible();
    await page.goto("/property/e2e-5");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("#5");
  });

  test("uploading the same file again creates no duplicates", async ({ page }) => {
    await login(page);
    const before = await snapshot();
    await upload(page, "weekly-listings.csv", toCsv(weeklyRows()), "text/csv");
    await previewAndConfirm(page, /0 to add, 0 to update, 30 unchanged/);
    await expect(page.getByRole("status")).toContainText("0 added, 0 updated, 30 unchanged");
    const after = await snapshot();
    expect(after.length).toBe(30);
    expect(after).toEqual(before);
    const { rows } = await db().query("select listing_id, count(*)::int as n from listings group by listing_id having count(*) > 1");
    expect(rows).toEqual([]);
  });

  test("Excel upload with the owner's own column names updates matching listings", async ({ page }) => {
    await login(page);
    const rows = weeklyRows();
    const changed = [
      { ...rows[0], price: "2 Cr", last_updated: "24-10-2026" },
      { ...rows[1], listing_status: "Sold", last_updated: "24-10-2026" },
      rows[3],
    ];
    const names: Record<string, string> = {
      listing_id: "Property ID", title: "Property Name", transaction_type: "Sale/Rent", property_type: "Property Type",
      listing_status: "Status", price: "Expected Price (₹)", locality: "Location", city: "City", state: "State", pincode: "Pin Code",
      bedrooms: "BHK", bathrooms: "Bathrooms", area_value: "Area (Sq.Ft.)", area_unit: "Unit", area_type: "Area Type",
      furnishing_status: "Furnishing", description: "Remarks", amenities: "Amenities", image_urls: "Photos", featured: "Featured",
      rera_project_number: "RERA No", last_updated: "Updated On",
    };
    await upload(page, "my-sheet.xlsx", await toXlsx(changed, names), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await page.waitForURL(/\/admin\/imports\/[0-9a-f-]{36}/);
    // Columns were recognised automatically from the owner's headings
    await expect(page.locator('select[name="map_price"]')).toHaveValue("5");
    await expect(page.locator('select[name="map_listing_id"]')).toHaveValue("0");
    await page.getByLabel(/Remember this mapping/).fill("My weekly sheet");
    await previewAndConfirm(page, /0 to add, 2 to update, 1 unchanged/);
    await expect(page.getByRole("status")).toContainText("0 added, 2 updated, 1 unchanged");

    const [e1] = (await db().query("select price, id from listings where listing_id = 'E2E-1'")).rows;
    expect(Number(e1.price)).toBe(20_000_000);
    await page.goto("/property/e2e-1");
    await expect(page.getByText("₹2 Cr").first()).toBeVisible();
    // Sold listing disappears from search and its page says so
    await page.goto("/buy?q=E2E-2");
    await expect(page.getByRole("status").filter({ hasText: "propert" })).toBeVisible();
    await expect(page.locator('a[href^="/property/e2e-2/"]')).toHaveCount(0);
    await page.goto("/property/e2e-2");
    await expect(page.getByText(/no longer available/i).first()).toBeVisible();
    expect((await db().query("select count(*)::int as n from mapping_profiles")).rows[0].n).toBe(1);
  });

  test("legacy .xls files can be imported", async ({ page }) => {
    const XLSX = await import("@e965/xlsx");
    const rows = weeklyRows().slice(10, 12).map((r) => ({ ...r, listing_id: r.listing_id.replace("E2E", "XLS") }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([Object.keys(rows[0]), ...rows.map((r) => Object.values(r))]), "Sheet1");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "biff8" }) as Buffer;
    await login(page);
    await upload(page, "old-format.xls", buf, "application/vnd.ms-excel");
    await previewAndConfirm(page, /2 to add/);
    await expect(page.getByRole("status")).toContainText("2 added");
  });

  test("invalid files and rows never corrupt existing data", async ({ page }) => {
    await login(page);
    const before = await snapshot();

    // Not really an Excel file
    await upload(page, "fake.xlsx", Buffer.from("this is not a spreadsheet"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toContainText("does not look like an Excel file");

    // Rows with errors, imported in strict mode → nothing changes
    const bad = weeklyRows().slice(0, 3).map((r, i) => (i === 0 ? { ...r, price: "lots of money" } : { ...r, price: "9 Cr" }));
    await upload(page, "bad.csv", toCsv(bad), "text/csv");
    await previewAndConfirm(page, /1 rejected/, { strict: true });
    await expect(page.getByRole("alert").filter({ hasText: /\S/ }).first()).toContainText("Nothing was changed");
    expect(await snapshot()).toEqual(before);

    // Error report is downloadable and explains the problem
    const reportLink = page.getByRole("link", { name: /Download error report/ });
    const [dl] = await Promise.all([page.waitForEvent("download"), reportLink.click()]);
    expect(await readFile((await dl.path())!, "utf8")).toContain('price ""lots of money"" is not a valid amount');
  });

  test("listings missing from a weekly file are left untouched (never auto-deleted)", async ({ page }) => {
    await login(page);
    const before = await snapshot();
    await upload(page, "partial.csv", toCsv(weeklyRows().slice(5, 6)), "text/csv");
    await previewAndConfirm(page, /0 to add, 0 to update, 1 unchanged/);
    expect(await snapshot()).toEqual(before);
  });
});
