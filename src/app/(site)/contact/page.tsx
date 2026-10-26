import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactForm } from "@/components/forms/ContactForm";
import { SpamFields } from "@/components/forms/SpamFields";
import { Placeholder } from "@/components/site/Placeholder";
import { IconMail, IconPhone, IconPin } from "@/components/ui/icons";
import { getSettings } from "@/lib/settings";
import { formatAddress, isPlaceholder, orPlaceholder } from "@/lib/settings-schema";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Shree Krishna Associate about buying, renting, selling or letting property.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="container-page grid gap-14 py-14 lg:grid-cols-[1fr_1.3fr] lg:py-20">
      <div>
        <p className="eyebrow">Contact</p>
        <span className="hairline mt-3" />
        <h1 className="mt-4 text-5xl text-navy sm:text-6xl">We&apos;d love to hear from you</h1>
        <p className="mt-4 max-w-md text-muted">
          Questions about a property, selling or letting, or anything else — send us a message and our team will reply.
        </p>
        <Suspense fallback={<div className="skeleton mt-10 h-40" />}>
          <ContactDetails />
        </Suspense>
      </div>
      <div className="bg-white p-6 shadow-[var(--shadow-lift)] sm:p-9">
        <h2 className="mb-6 font-display text-3xl text-navy">Send a message</h2>
        <Suspense fallback={<div className="skeleton h-[480px]" />}>
          <ContactForm>
            <SpamFields form="contact" />
          </ContactForm>
        </Suspense>
      </div>
    </div>
  );
}

async function ContactDetails() {
  const s = await getSettings();
  const phone = orPlaceholder(s.business.phone, "phone number");
  const address = formatAddress(s);
  return (
    <ul className="mt-10 space-y-6">
      <li className="flex gap-4">
        <IconMail size={22} className="mt-0.5 shrink-0 text-gold" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Email</p>
          <a className="link break-all" href={`mailto:${s.business.email}`}>{s.business.email}</a>
        </div>
      </li>
      <li className="flex gap-4">
        <IconPhone size={22} className="mt-0.5 shrink-0 text-gold" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Phone / WhatsApp</p>
          {isPlaceholder(phone) ? <Placeholder text={phone} /> : <a className="link" href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>}
          {s.business.whatsapp ? (
            <p className="mt-1">
              <a className="link" href={`https://wa.me/${s.business.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                Message on WhatsApp
              </a>
            </p>
          ) : null}
        </div>
      </li>
      <li className="flex gap-4">
        <IconPin size={22} className="mt-0.5 shrink-0 text-gold" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Office</p>
          {isPlaceholder(address) ? <Placeholder text={address} /> : <p>{address}</p>}
          <p className="mt-1 text-sm text-muted">{s.business.officeHours || <Placeholder text="[DEMO ONLY — INSERT VERIFIED OFFICE HOURS]" />}</p>
        </div>
      </li>
    </ul>
  );
}
