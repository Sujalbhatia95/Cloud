/**
 * Accessibility: automated WCAG 2.1 A/AA checks (axe-core) on the main public pages and the admin login.
 * Fails on "serious" or "critical" violations.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

const PAGES = ["/", "/buy", "/rent?beds=2", "/property/demo-102", "/sell", "/valuation", "/contact", "/about", "/disclosures", "/admin/login"];

for (const path of PAGES) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // Reveal-on-scroll content is faded in by JS; show everything so contrast is measured on final colours.
    await page.evaluate(() => document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible")));
    await page.waitForTimeout(1000);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const summary = serious.map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}
