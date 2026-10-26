/**
 * Notification emails sent to the business inbox. Every value is HTML-escaped.
 */
import { formatDateIST, formatDateTimeIST } from "@/lib/listings/format";

const esc = (s: string | number | null | undefined) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Row = [label: string, value: string | null | undefined, opts?: { link?: string }];

function layout(title: string, intro: string, rows: Row[], footer: string): { html: string; text: string } {
  const htmlRows = rows
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([label, value, opts]) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #ece8e1;color:#5b6170;font-size:13px;width:180px;vertical-align:top">${esc(label)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #ece8e1;color:#141a2e;font-size:14px;white-space:pre-wrap">${
          opts?.link ? `<a href="${esc(opts.link)}" style="color:#1230b8">${esc(value)}</a>` : esc(value)
        }</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ee;padding:24px 0"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e2d8;max-width:600px">
    <tr><td style="background:#0b1a4f;padding:18px 24px;color:#ffffff;font-size:13px;letter-spacing:.14em;text-transform:uppercase">Shree Krishna Associate · Website</td></tr>
    <tr><td style="padding:24px 24px 8px"><h1 style="margin:0 0 8px;font-size:20px;color:#141a2e">${esc(title)}</h1>
      <p style="margin:0 0 16px;color:#5b6170;font-size:14px;line-height:1.5">${esc(intro)}</p></td></tr>
    <tr><td style="padding:0 12px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${htmlRows}</table></td></tr>
    <tr><td style="padding:16px 24px 24px;color:#8a8f9c;font-size:12px;line-height:1.5">${esc(footer)}</td></tr>
  </table></td></tr></table></body></html>`;
  const text = [
    title,
    "",
    intro,
    "",
    ...rows.filter(([, v]) => v).map(([label, value]) => `${label}: ${value}`),
    "",
    footer,
  ].join("\n");
  return { html, text };
}

const FOOTER =
  "This message contains personal data submitted through your website. Handle it according to your privacy notice and delete it when no longer needed.";

export function showingRequestEmail(d: {
  reference: string;
  name: string;
  email: string;
  phone: string;
  propertyTitle: string;
  propertyUrl: string;
  listingId: string;
  preferredDate: string;
  preferredTimeLabel: string;
  flexibilityLabel: string;
  message: string | null;
  submittedAt: Date;
  adminUrl: string;
  isDemo: boolean;
}) {
  const subject = `${d.isDemo ? "[DEMO LISTING] " : ""}Showing request: ${d.propertyTitle} (${d.listingId}) — ${d.name}`;
  const body = layout(
    "New request to view a property",
    "A visitor asked to schedule a showing. The appointment is NOT confirmed yet — please contact them to agree a time.",
    [
      ["Reference", d.reference],
      ["Customer name", d.name],
      ["Email", d.email, { link: `mailto:${d.email}` }],
      ["Phone", d.phone, { link: `tel:${d.phone.replace(/\s/g, "")}` }],
      ["Property", d.propertyTitle, { link: d.propertyUrl }],
      ["Property URL", d.propertyUrl, { link: d.propertyUrl }],
      ["Listing ID", d.listingId],
      ["Requested date", formatDateIST(d.preferredDate)],
      ["Requested time", d.preferredTimeLabel],
      ["Flexibility", d.flexibilityLabel],
      ["Message", d.message ?? "(none)"],
      ["Submitted", formatDateTimeIST(d.submittedAt)],
      ["Manage in admin", d.adminUrl, { link: d.adminUrl }],
    ],
    FOOTER,
  );
  return { subject, ...body };
}

export function sellerEnquiryEmail(d: {
  reference: string;
  typeLabel: string;
  ownerName: string;
  email: string;
  phone: string;
  preferredContact: string;
  location: string;
  propertyTypeLabel: string;
  area: string | null;
  bedrooms: number | null;
  expectedPrice: string | null;
  details: string | null;
  valuationNote: string | null;
  submittedAt: Date;
  adminUrl: string;
}) {
  const subject = `Seller enquiry (${d.typeLabel}): ${d.propertyTypeLabel} in ${d.location.split(",")[0]} — ${d.ownerName}`;
  const body = layout(
    "New property owner enquiry",
    `An owner submitted the "${d.typeLabel}" form on your website.`,
    [
      ["Reference", d.reference],
      ["Owner name", d.ownerName],
      ["Email", d.email, { link: `mailto:${d.email}` }],
      ["Phone", d.phone, { link: `tel:${d.phone.replace(/\s/g, "")}` }],
      ["Preferred contact", d.preferredContact],
      ["Location", d.location],
      ["Property type", d.propertyTypeLabel],
      ["Area", d.area],
      ["Bedrooms", d.bedrooms !== null ? String(d.bedrooms) : null],
      ["Expected price", d.expectedPrice],
      ["Supporting information", d.details ?? "(none)"],
      ["Website estimate shown", d.valuationNote],
      ["Submitted", formatDateTimeIST(d.submittedAt)],
      ["Manage in admin", d.adminUrl, { link: d.adminUrl }],
    ],
    FOOTER,
  );
  return { subject, ...body };
}

export function contactEmail(d: {
  reference: string;
  name: string;
  email: string;
  phone: string | null;
  subjectLabel: string;
  message: string;
  submittedAt: Date;
  adminUrl: string;
}) {
  const subject = `Website enquiry (${d.subjectLabel}) — ${d.name}`;
  const body = layout(
    "New contact form message",
    "A visitor sent a message through the contact page.",
    [
      ["Reference", d.reference],
      ["Name", d.name],
      ["Email", d.email, { link: `mailto:${d.email}` }],
      ["Phone", d.phone],
      ["Subject", d.subjectLabel],
      ["Message", d.message],
      ["Submitted", formatDateTimeIST(d.submittedAt)],
      ["Manage in admin", d.adminUrl, { link: d.adminUrl }],
    ],
    FOOTER,
  );
  return { subject, ...body };
}

export function testEmail(siteUrl: string, sentBy: string) {
  const subject = "Test email from your Shree Krishna Associate website";
  const body = layout(
    "Email delivery is working",
    "This test was sent from Admin → Emails. Enquiry and showing notifications will arrive at this address.",
    [
      ["Website", siteUrl, { link: siteUrl }],
      ["Sent by", sentBy],
      ["Sent at", formatDateTimeIST(new Date())],
    ],
    "No action is needed.",
  );
  return { subject, ...body };
}
