/**
 * Acceptance test 9 (links): every internal link and local image on the public pages resolves.
 */
import { expect, test } from "./fixtures";

const START = ["/", "/buy", "/rent", "/commercial", "/sell", "/valuation", "/about", "/contact", "/privacy", "/terms", "/disclosures", "/property/demo-101/contemporary-4-bhk-villa-with-private-pool-kalyani-nagar-pune", "/property/demo-104/grade-a-office-floor-with-open-plan-workspace-sector-62-noida"];

test("all internal links and images on public pages work", async ({ page, request }) => {
  const links = new Set<string>();
  const images = new Set<string>();
  for (const path of START) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await page.waitForLoadState("networkidle");
    for (const href of await page.locator("a[href^='/']").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!))) {
      if (!href.startsWith("/admin") && !href.startsWith("/#")) links.add(href.split("#")[0]);
    }
    for (const src of await page.locator("img").evaluateAll((is) => is.map((i) => (i as HTMLImageElement).currentSrc || (i as HTMLImageElement).src))) {
      if (src.startsWith("http://localhost")) images.add(src);
    }
  }
  const failures: string[] = [];
  for (const href of links) {
    const r = await request.get(href, { maxRedirects: 5 });
    if (r.status() >= 400) failures.push(`${r.status()} ${href}`);
  }
  for (const src of images) {
    const r = await request.get(src);
    if (r.status() >= 400) failures.push(`${r.status()} ${src}`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
  expect(links.size).toBeGreaterThan(25);
});

test("sitemap lists real listings only (no demo, no admin)", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toContain("<loc>http://localhost:3100/buy</loc>");
  expect(xml).toContain("/property/e2e-");
  expect(xml).not.toContain("demo-");
  expect(xml).not.toContain("/admin");
});
