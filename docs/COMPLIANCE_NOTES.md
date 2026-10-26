# Indian legal & compliance notes

> **Not legal advice.** These notes explain how the website was built to support compliance and what the business
> still has to do. Requirements differ between States/UTs and depend on your actual activities. Have a qualified
> lawyer in your State/UT review your registration position, the Privacy Notice, Terms and Disclosures before launch.
> The website does not, and cannot, guarantee compliance.

## 1. Jurisdiction

The State/UT of operation is not known yet, so the site is **configured, not assumed**: set it in Admin → Business
settings → *State / UT where you operate*. It is shown on the Disclosures page and used by the compliance checklist.
If you operate in more than one State/UT, describe each registration on the Disclosures page.

No RERA authority names, websites or registration numbers have been pre-filled, because publishing an incorrect
government link or number would itself be misleading. Enter them only from official sources.

## 2. RERA — Real Estate (Regulation and Development) Act, 2016

What the website does:

- **Agent registration** (Admin → Business settings): status *Registered* (number, authority, website, validity),
  *Not required* (with the legal reason recorded) or *Not yet confirmed*. The statement appears in the footer, on
  every property page and on the Disclosures page. Until set, an unmistakable placeholder is shown:
  **[DEMO ONLY — INSERT VERIFIED RERA DETAILS IF APPLICABLE]**.
- **Project registration**: each listing has a `rera_project_number` shown on its page with a prompt to verify it on
  the authority's website. Under-construction sale listings without a number show the placeholder, produce an import
  warning, and are a **launch blocker** in the compliance checklist.
- **Carpet area**: every listing states its area type; the importer warns when a RERA-registered listing is not on
  carpet area.

What you must do:

- Confirm with a lawyer whether your activities require registration as a real estate agent with your State RERA
  authority (generally required to facilitate sale/purchase of units in projects that must be registered), register
  if so, and renew before expiry.
- Do not advertise or facilitate sales in projects that are required to be registered but are not.
- Quote registration numbers exactly; verify each project number on the State RERA website.
- Follow your State's rules on agents' books of account, records and conduct.

## 3. Personal data — Digital Personal Data Protection Act, 2023 (and rules), IT Act 2000

What the website does:

- **Notice & consent:** every form has an unticked consent checkbox linking to the Privacy Notice, and a separate
  optional marketing checkbox. The consent time and notice version are stored with each enquiry.
- **Data minimisation:** only fields needed to respond; no identity documents; IP addresses kept only as keyed hashes
  for abuse prevention; no analytics or advertising cookies.
- **Purpose limitation & access control:** enquiries are visible only to *admin* and *agent* roles; *editors* cannot
  see them. All admin actions are audit-logged.
- **Retention:** configurable (default 730 days); older enquiries are deleted automatically by the daily job, or on
  demand.
- **Rights:** staff can find and permanently erase an individual's enquiry and its emails (erasure requests).
- **Security:** hashed passwords, server-side sessions, rate limits, security headers, encrypted connections.

What you must do:

- Appoint and publish a **Grievance Officer** (Admin → Business settings).
- Have the Privacy Notice reviewed and approved; keep it accurate as you add services or providers.
- Accept data-processing terms with your hosting, database and email providers; note where they store data.
- Have a breach-response plan (who notifies affected people and the Data Protection Board, and how quickly).
- Respond to access/correction/erasure requests within the time required by the rules in force.

## 4. Advertising, pricing & consumer protection

- Consumer Protection Act, 2019 and guidelines on misleading advertisements: the site avoids unverifiable claims
  ("best", "No. 1", invented statistics). Review your own descriptions for the same.
- Every listing shows price & availability disclaimers; prices exclude stamp duty, registration, GST and other
  charges unless stated; status changes (under offer, sold, rented) are reflected immediately on upload.
- The estimate calculator never invents data: it labels results *Indicative* only when based on ≥3 verified
  comparables you entered, *Illustrative* when based on listing asking prices or the visitor's own rate, and
  otherwise says there is not enough data. It is never described as a valuation.
- Obtain written authorisation from owners/developers before advertising a property.

## 5. Brokerage, GST and agreements

- Brokerage/commission terms are editable in Admin → Business settings and shown on property pages and the
  Disclosures page. State who pays, when it is payable, and whether you may act for both sides.
- Charge GST where applicable and display your GSTIN if registered.
- Use written brokerage/service agreements before providing services.

## 6. Government affiliation

The Disclosures page states that the business is private and not affiliated with any government body or RERA
authority. Do not use government emblems, logos or names in a way that suggests affiliation.

## 7. Where each item is managed

| Item | Where |
|---|---|
| Legal name, entity type, address, phone, GSTIN, office hours | Admin → Business settings |
| State/UT of operation, RERA agent registration | Admin → Business settings |
| Brokerage terms | Admin → Business settings |
| Grievance officer, retention period | Admin → Business settings |
| Privacy Notice, Terms, Disclosures, About text | Admin → Legal & page content |
| Launch blockers and sign-offs | Admin → Compliance checklist |
| Demo mode | Admin → Business settings → Demo mode |
