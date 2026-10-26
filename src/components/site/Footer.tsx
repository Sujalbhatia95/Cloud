import Image from "next/image";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { formatAddress, isPlaceholder, orPlaceholder, reraAgentLine } from "@/lib/settings-schema";
import { Placeholder } from "./Placeholder";

export async function SiteFooter() {
  const s = await getSettings();
  const year = new Date().getFullYear();
  const address = formatAddress(s);
  const phone = orPlaceholder(s.business.phone, "phone number");
  const rera = reraAgentLine(s);
  return (
    <footer className="mt-auto border-t border-stone bg-sand text-ink">
      <div className="container-page grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link href="/" className="inline-block" aria-label="Shree Krishna Associate — home">
            <Image src="/brand/logo-transparent.png" alt="Shree Krishna Associate" width={875} height={565} sizes="140px" className="h-20 w-auto" />
          </Link>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">
            Residential, rental and commercial property services — buying, renting, selling and letting.
          </p>
        </div>
        <nav aria-label="Explore" className="md:col-span-2">
          <h2 className="eyebrow">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="hover:text-royal" href="/buy">Buy</Link></li>
            <li><Link className="hover:text-royal" href="/rent">Rent</Link></li>
            <li><Link className="hover:text-royal" href="/commercial">Commercial</Link></li>
            <li><Link className="hover:text-royal" href="/sell">Sell or let</Link></li>
            <li><Link className="hover:text-royal" href="/valuation">Property estimate</Link></li>
          </ul>
        </nav>
        <nav aria-label="Company" className="md:col-span-2">
          <h2 className="eyebrow">Company</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="hover:text-royal" href="/about">About</Link></li>
            <li><Link className="hover:text-royal" href="/contact">Contact</Link></li>
            <li><Link className="hover:text-royal" href="/disclosures">Disclosures</Link></li>
            <li><Link className="hover:text-royal" href="/privacy">Privacy notice</Link></li>
            <li><Link className="hover:text-royal" href="/terms">Terms of use</Link></li>
          </ul>
        </nav>
        <div className="md:col-span-4">
          <h2 className="eyebrow">Contact</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a className="hover:text-royal break-all" href={`mailto:${s.business.email}`}>{s.business.email}</a>
            </li>
            <li>{isPlaceholder(phone) ? <Placeholder text={phone} /> : <a className="hover:text-royal" href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>}</li>
            <li>{isPlaceholder(address) ? <Placeholder text={address} /> : address}</li>
            {s.business.officeHours ? <li>{s.business.officeHours}</li> : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-stone">
        <div className="container-page space-y-3 py-8 text-xs leading-relaxed text-muted">
          <p>
            <span className="font-semibold text-ink">Regulatory: </span>
            {rera.includes("[DEMO ONLY") ? <Placeholder text={rera} /> : rera}
            {s.operatingState ? ` · Operating in ${s.operatingState}` : null}
            {s.business.gstin ? ` · GSTIN ${s.business.gstin}` : null}
          </p>
          <p>
            Listing details, prices and availability are supplied by owners/developers and may change without notice. They are not an
            offer or a contract. Verify all details, approvals and RERA registrations independently before making any decision. See{" "}
            <Link href="/disclosures" className="underline underline-offset-2 hover:text-royal">Disclosures</Link>.
          </p>
          <p>© {year} {s.business.legalName || s.business.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export function SiteFooterFallback() {
  return <footer className="mt-auto h-80 border-t border-stone bg-sand" aria-hidden />;
}
