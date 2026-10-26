/**
 * Default text for the editable pages (Admin → Content). These are DRAFTS prepared for review by a
 * qualified Indian lawyer — they are not legal advice and do not guarantee compliance.
 * {{tokens}} are replaced with values from Admin → Settings, or an unmistakable placeholder when missing.
 */
export type PageSlug = "privacy" | "terms" | "disclosures" | "about";

export const CONTENT_TOKENS: Record<string, string> = {
  "business.name": "Trading name",
  "business.legalName": "Registered legal name of the business",
  "business.entityType": "Type of entity (proprietorship, partnership, LLP, company)",
  "business.address": "Office address",
  "business.email": "Business email",
  "business.phone": "Phone number",
  "business.gstin": "GSTIN (if registered)",
  "operatingState": "State / UT of operation",
  "rera.agentLine": "RERA agent registration statement",
  "rera.authorityName": "State RERA authority",
  "rera.authorityWebsite": "State RERA authority website",
  "brokerage.sale": "Brokerage for sales",
  "brokerage.rent": "Brokerage for rentals",
  "brokerage.commercial": "Brokerage for commercial",
  "brokerage.notes": "Other brokerage notes",
  "privacy.grievanceOfficer": "Grievance officer name and contact",
  "privacy.retentionDays": "Retention period",
  "jurisdictionCity": "City for courts' jurisdiction",
  "lastUpdated": "Date the page was last updated",
};

export const DEFAULT_PAGES: Record<PageSlug, { title: string; body: string }> = {
  privacy: {
    title: "Privacy Notice",
    body: `_Last updated: {{lastUpdated}}_

This notice explains how **{{business.legalName}}** (trading as {{business.name}}, "we", "us") collects and uses personal data through this website. It is written to meet the notice requirements of the Digital Personal Data Protection Act, 2023 and the rules made under it, as and when they apply, and the Information Technology Act, 2000 and its rules to the extent applicable.

## 1. Who is responsible for your data

{{business.legalName}} ({{business.entityType}}), {{business.address}}. Email: {{business.email}}. Phone: {{business.phone}}.

## 2. What we collect and why

| When you… | We collect | Purpose |
|---|---|---|
| Request a property showing | Name, email, mobile number, preferred date/time, flexibility, the property, your message | To arrange and confirm the viewing and answer your questions |
| Submit the Sell / Let or valuation form | Name, email, mobile number, preferred contact method, property location and details, expected price, information you choose to share | To respond to you about selling, letting or valuing your property |
| Send a message from the Contact page | Name, email, optional mobile number, subject, message | To reply to your enquiry |
| Visit the website | A keyed (one-way) hash of your IP address, recorded only when you submit a form | Fraud and spam prevention |

We ask only for what we need to respond. Please do **not** send identity documents, bank details or passwords through the website.

**Consent.** We process the details you submit on the basis of the consent you give when you tick the consent box on each form. Marketing updates are optional and are sent only if you tick that separate box. You can withdraw consent at any time by emailing {{business.email}}; this does not affect processing that happened before withdrawal.

## 3. Who we share data with

We do not sell personal data. We share it only with service providers who process it on our behalf under contract — website hosting, our database provider and our email delivery provider — and with a property owner or developer only when needed to arrange a viewing you requested. We may disclose data where required by law or by a lawful order.

Some of these providers may store or process data outside India. Where this happens we rely on their contractual and security commitments and comply with any restrictions notified by the Government of India.

## 4. How long we keep it

Enquiries are kept for up to **{{privacy.retentionDays}}** after our last contact with you, unless a longer period is required by law (for example for tax or legal claims). After that they are deleted.

## 5. Security

Enquiries are stored in an access-controlled database. Only authorised staff whose role needs the information can view it; staff accounts use individual passwords and every administrative action is logged. No system is perfectly secure; if a personal data breach occurs we will notify affected people and the authorities as required by law.

## 6. Your rights

Subject to applicable law you can ask us to: confirm what personal data we hold about you and how it is used; correct, complete or update it; erase it when it is no longer needed; withdraw consent; and nominate another person to exercise your rights in the event of death or incapacity. Contact our Grievance Officer below. We aim to respond within the period required by law.

## 7. Grievance Officer

{{privacy.grievanceOfficer}}

If you are not satisfied with our response, you may complain to the Data Protection Board of India once it is operational for such complaints.

## 8. Cookies

The public website does not use advertising or analytics cookies. Staff who sign in to the administration area receive a strictly necessary session cookie. If we enable a security check (Cloudflare Turnstile) on forms, Cloudflare may set cookies needed for that check.

## 9. Children

This website is intended for adults. Please do not submit personal data if you are under 18.

## 10. Changes

We will post any changes on this page with a new "last updated" date.
`,
  },
  terms: {
    title: "Terms of Use",
    body: `_Last updated: {{lastUpdated}}_

These terms govern your use of this website operated by **{{business.legalName}}** (trading as {{business.name}}). By using the website you agree to them.

## 1. Information only — not an offer

Listings, prices, areas, images and descriptions are provided for general information. They are supplied by owners, developers or our team in good faith but may contain errors and can change or be withdrawn without notice. Nothing on this website is an offer, a contract, or legal, financial or tax advice. Any transaction is subject to a separate written agreement.

## 2. Verify before you commit

Before paying any amount or signing any document, verify title, approvals, RERA registration (where applicable), carpet area, charges and all other details yourself or with professional advisers. Do not make payments to anyone on the strength of this website alone.

## 3. Viewing requests

Submitting a showing request does not book an appointment. A viewing is confirmed only when our team confirms it with you.

## 4. Property estimates

Estimates from our calculator are indicative or illustrative only, depend on limited data, and are not a valuation report. Do not rely on them for lending, legal, tax or investment decisions.

## 5. Your responsibilities

You agree to provide accurate information, use the website lawfully, and not attempt to copy listings in bulk, disrupt the website, or access areas you are not authorised to use.

## 6. Intellectual property

The website design, text and our logo belong to us or our licensors. Listing photographs belong to their owners. You may share links to listings for personal use.

## 7. Liability

To the extent permitted by law, we are not liable for any loss arising from reliance on information on this website or from its unavailability. Nothing in these terms limits liability that cannot be limited under Indian law.

## 8. Governing law

These terms are governed by the laws of India. Courts at {{jurisdictionCity}} have jurisdiction, subject to any mandatory consumer protection rights you may have.

## 9. Contact

{{business.email}} · {{business.phone}} · {{business.address}}
`,
  },
  disclosures: {
    title: "Disclosures",
    body: `_Last updated: {{lastUpdated}}_

## Who we are

{{business.name}} is the trading name of **{{business.legalName}}** ({{business.entityType}}). Office: {{business.address}}. GSTIN: {{business.gstin}}. We operate in {{operatingState}}.

We are a private business. We are **not** affiliated with, endorsed by or acting for any government body, development authority or RERA authority.

## RERA (Real Estate (Regulation and Development) Act, 2016)

{{rera.agentLine}}

State RERA authority: {{rera.authorityName}} — {{rera.authorityWebsite}}.

Under RERA, real estate agents who facilitate the sale or purchase of units in projects that must be registered are themselves required to register with the State authority, and such projects must display their project registration number in advertisements. Where a listing on this website relates to a registered project, its **RERA project registration number** is shown on the property page exactly as provided; please verify it on the State authority's official website before you pay any amount. We do not knowingly advertise projects that are required to be registered but are not. Completed, resale and rental properties may fall outside RERA project registration — confirm the applicable approvals for each property.

## Brokerage and commission

- **Sales:** {{brokerage.sale}}
- **Rentals / leases:** {{brokerage.rent}}
- **Commercial property:** {{brokerage.commercial}}

{{brokerage.notes}}

Brokerage becomes payable only under a written agreement signed before the service is provided. Applicable taxes (such as GST) are charged in addition where required. If we may act for both the buyer/tenant and the seller/landlord in the same transaction, we will tell you in writing before you proceed.

## Listing accuracy

Property information is supplied by owners, developers or our team and is reviewed in good faith, but it is not guaranteed. Areas are shown as stated by the source together with the area type (carpet, built-up, super built-up or plot); for RERA-registered projects carpet area is the legally relevant measure. Images may be illustrative. Report any error to {{business.email}} and we will correct it.

## Prices and availability

Prices are the owner's or developer's asking price (monthly rent for rentals) and exclude stamp duty, registration charges, GST, maintenance deposits, parking and other charges unless stated. Prices and availability may change at any time, and a property may be sold, let or withdrawn before the website is updated. Listings marked "Under offer" are not currently available for a new offer.

## Property estimates

The estimate calculator shows (a) a range based on verified comparable transactions recorded by our team when at least three exist, otherwise (b) a range based on asking prices of listings on this website, clearly labelled as such, otherwise (c) an illustrative calculation using a rate you enter. It is not a valuation report and is not a guarantee of any sale price.

## Demonstration content

While demo mode is switched on, listings marked **DEMO** are fictional examples and their photos are licensed stock photographs that do not show the advertised property. They are not properties available for sale or rent.

## Complaints

Contact us at {{business.email}} or {{business.phone}}. For privacy matters, see our Grievance Officer in the Privacy Notice.
`,
  },
  about: {
    title: "About us",
    body: `## A local property practice built on trust

{{business.name}} helps families and businesses buy, rent and sell residential and commercial property in {{operatingState}}.

We work with owners to present their properties honestly, and with buyers and tenants to find homes and workspaces that genuinely fit — guiding you through viewings, negotiations, documentation and handover.

## What we do

- **Buying** — apartments, independent houses, villas, plots and new projects.
- **Renting** — furnished and unfurnished homes, with clear terms for owners and tenants.
- **Commercial** — offices, shops, showrooms, warehouses and land.
- **Selling and letting** — pricing advice, marketing, screened enquiries and accompanied viewings.

## Our team

[DEMO ONLY — INSERT VERIFIED DETAILS ABOUT YOUR TEAM, YEAR OF ESTABLISHMENT AND EXPERIENCE]

## Visit us

{{business.address}} · {{business.phone}} · {{business.email}}
`,
  },
};
