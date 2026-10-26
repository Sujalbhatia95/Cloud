# Weekly listings spreadsheet — guide for staff

Use this to add, update and remove properties on the website every week. No coding is needed.

**Templates:** Admin → Spreadsheet imports → *Download template*, or the files in `docs/templates/`:

- `shree-krishna-listings-template.xlsx` — Excel template with dropdowns, notes on every column, an **Instructions**
  sheet and an **Examples** sheet. Type your listings on the **Listings** sheet.
- `shree-krishna-listings-template.csv` — the same columns, empty.
- `shree-krishna-listings-example.csv` — three example rows.

You can also keep using **your own spreadsheet** with your own column names — the website will match them for you
and remember the mapping.

---

## The weekly routine

1. Update your spreadsheet (add new properties, change prices/status, mark sold or rented ones).
2. Save it as `.xlsx` (recommended), `.csv` or `.xls`.
3. Admin → **Spreadsheet imports** → choose the file → **Upload and map columns**.
4. Check the column matches → **Validate & preview**.
5. Read the preview: *to add*, *to update* (with what changed), *unchanged*, *skipped*, *rejected*. Download the
   error report if anything is rejected, fix your sheet and upload again — or import the valid rows now.
6. Tick **"I have reviewed the preview…"** → **Confirm import**. The website updates immediately.

## Golden rules

| Rule | Why |
|---|---|
| Every property has a permanent, unique **listing_id** (e.g. `SKA-1001`) | It is how the website recognises the same property next week. Never reuse an ID for a different property. |
| Same ID again = **update**; new ID = **add** | Uploading the same file twice never creates duplicates. |
| A property missing from your file is **left as it is** | Nothing is ever deleted automatically. |
| To take a property off the website, set **listing_status** to `Archived`, `Sold` or `Rented` | Sold/Rented pages show "no longer available"; Archived pages disappear. |
| Fill **last_updated** (DD-MM-YYYY) | If an older copy of your sheet is uploaded by mistake, older rows are skipped instead of overwriting newer data. |
| Only use photos you own or are licensed to use | Copying photos from other portals can infringe copyright. |
| Never guess a **RERA number** | Copy it exactly from the State RERA website, or leave it blank. |

## Columns

Required columns are marked ✱. Upper/lower case and extra spaces do not matter.

| Column | ✱ | What to enter | Examples |
|---|---|---|---|
| `listing_id` | ✱ | Your unique reference. Letters, numbers, `-`, `_`, `.` only. | `SKA-1001` |
| `title` | ✱ | Headline, 5–150 characters. | `3 BHK apartment with garden view` |
| `transaction_type` | ✱ | Sale or Rent. | `Sale`, `Rent`, `Resale`, `Lease`, `To let` |
| `property_type` | ✱ | Apartment, Independent House, Villa, Builder Floor, Penthouse, Studio, Row House, Farm House, Residential Plot, Commercial Plot, Agricultural Land, Industrial Land, Office, Shop, Showroom, Warehouse, Industrial Shed, Co-working, Hotel | `Flat`, `Godown`, `Office Space` also work |
| `listing_status` | ✱ | Active (shown), Under offer (shown only if visitors ask), Sold, Rented, Archived (hidden), Draft (hidden) | `Active`, `Available`, `Withdrawn` |
| `price` | ✱ | Sale price, or **monthly** rent. Write `Price on request` to hide it. | `12500000`, `1,25,00,000`, `125 Lakh`, `1.25 Cr`, `45000`, `25k` |
| `price_negotiable` | | Yes / No | `Yes` |
| `locality` | ✱ | Area / sector / neighbourhood | `Baner` |
| `city` | ✱ | City or town | `Pune` |
| `state` | ✱ | State or UT (abbreviations understood) | `Maharashtra`, `MH`, `UP` |
| `pincode` | | 6-digit PIN | `411045` |
| `bedrooms`, `bathrooms` | | Whole numbers (`3 BHK` is understood) | `3` |
| `area_value` | | Number | `1250` |
| `area_unit` | | sqft, sqm, sqyd (gaj), acre, hectare. *Bigha, guntha, kanal etc. vary by state — convert first.* | `sq ft`, `sq m`, `gaj` |
| `area_type` | | Carpet, Built-up, Super built-up, Plot. **RERA-registered projects must be marketed on carpet area.** | `Carpet` |
| `furnishing_status` | | Unfurnished, Semi-furnished, Fully furnished | `Semi` |
| `possession_status` | | Ready to move, Under construction | `RTM`, `UC` |
| `available_from` | | Date (DD-MM-YYYY) | `01-12-2026` |
| `floor`, `total_floors` | | Floor and building height | `7`, `14` |
| `parking`, `facing`, `age_years` | | Free text / number | `1 covered`, `East`, `5` |
| `maintenance_charges` | | ₹ per month | `4500` |
| `security_deposit` | | ₹ (rentals) | `1.5 Lakh` |
| `description` | | Up to 5,000 characters. Blank lines start new paragraphs. | |
| `amenities` | | Separated by `;` `\|` `,` or new lines | `Lift; Gym; Power backup` |
| `image_urls` | | https links separated by `\|` or new lines. Google Drive "Anyone with the link" share links are converted automatically. | `https://…/1.jpg \| https://…/2.jpg` |
| `featured` | | Yes to show on the home page | `Yes` |
| `rera_project_number` | | Exactly as on the State RERA website. Blank if not applicable. | |
| `last_updated` | | Date (and optional time) the row was last changed | `25-10-2026` |

Dates are read the Indian way (day first). Excel date cells, `2026-10-25` and `25 Oct 2026` also work.

## Photos

Host photos where they have a permanent public https link — for example Google Drive (share as "Anyone with the
link"), Dropbox, Cloudinary or Supabase Storage. Landscape photos at least 1600 px wide look best. The first image is
the cover photo. Up to 30 images per listing.

## What the results mean

| Result | Meaning |
|---|---|
| Added / Updated | Applied when you confirm. "Updated" lists the fields that changed. |
| Unchanged | Exactly the same as the website — nothing to do. |
| Skipped | Not applied: e.g. the row's `last_updated` is older than the website's version. |
| Rejected | Has an error (shown in plain language). Fix the row and upload again. Rejected rows never change the website. |
| Warning | Imported, but worth checking — e.g. "under-construction property for sale has no RERA project number". |

Limits: 4 MB per file, 5,000 rows, 80 columns. Password-protected files must be saved without a password first.
