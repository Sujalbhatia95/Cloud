/** Writes the spreadsheet templates to docs/templates (the same files staff can download in the admin). */
import { mkdir, writeFile } from "node:fs/promises";
import { buildTemplateCsv, buildTemplateXlsx } from "../src/lib/import/template";

async function main() {
  await mkdir("docs/templates", { recursive: true });
  await writeFile("docs/templates/shree-krishna-listings-template.xlsx", await buildTemplateXlsx());
  await writeFile("docs/templates/shree-krishna-listings-template.csv", buildTemplateCsv(false));
  await writeFile("docs/templates/shree-krishna-listings-example.csv", buildTemplateCsv(true));
  console.log("✓ Templates written to docs/templates/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
