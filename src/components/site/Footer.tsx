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
    <footer className="mt-auto bg-navy-900 text-white/80">
      <div className="container-page grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link href="/" className="inline-block rounded-sm bg-white p-3" aria-label="Shree Krishna Associate — home">
            <Image src="/brand/logo.png" alt="Shree Krishna Associate" width={875} height={565} sizes="120px" className="h-16 w-auto" />
          </Link>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/70">
            Residential, rental and commercial property services — buying, renting, selling and letting.
          </p>
        </div>
        <nav aria-label="Explore" className="md:col-span-2">
          <h2 className="eyebrow !text-gold">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="hover:text-white" href="/buy">Buy</Link></li>
            <li><Link className="hover:text-white" href="/rent">Rent</Link></li>
            <li><Link className="hover:text-white" href="/commercial">Commercial</Link></li>
            <li><Link className="hover:text-white" href="/sell">Sell or let</Link></li>
            <li><Link className="hover:text-white" href="/valuation">Property estimate</Link></li>
          </ul>
        </nav>
        <nav aria-label="Company" className="md:col-span-2">
          <h2 className="eyebrow !text-gold">Company</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="hover:text-white" href="/about">About</Link></li>
            <li><Link className="hover:text-white" href="/contact">Contact</Link></li>
            <li><Link className="hover:text-white" href="/disclosures">Disclosures</Link></li>
            <li><Link className="hover:text-white" href="/privacy">Privacy notice</Link></li>
            <li><Link className="hover:text-white" href="/terms">Terms of use</Link></li>
          </ul>
        </nav>
        <div className="md:col-span-4">
          <h2 className="eyebrow !text-gold">Contact</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a className="hover:text-white break-all" href={`mailto:${s.business.email}`}>{s.business.email}</a>
            </li>
            <li>{isPlaceholder(phone) ? <Placeholder text={phone} dark /> : <a className="hover:text-white" href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>}</li>
            <li>{isPlaceholder(address) ? <Placeholder text={address} dark /> : address}</li>
            {s.business.officeHours ? <li>{s.business.officeHours}</li> : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page space-y-3 py-8 text-xs leading-relaxed text-white/60">
          <p>
            <span className="font-semibold text-white/80">Regulatory: </span>
            {rera.includes("[DEMO ONLY") ? <Placeholder text={rera} dark /> : rera}
            {s.operatingState ? ` · Operating in ${s.operatingState}` : null}
            {s.business.gstin ? ` · GSTIN ${s.business.gstin}` : null}
          </p>
          <p>
            Listing details, prices and availability are supplied by owners/developers and may change without notice. They are not an
            offer or a contract. Verify all details, approvals and RERA registrations independently before making any decision. See{" "}
            <Link href="/disclosures" className="underline underline-offset-2 hover:text-white">Disclosures</Link>.
          </p>
          <p>© {year} {s.business.legalName || s.business.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export function SiteFooterFallback() {
  return <footer className="mt-auto h-80 bg-navy-900" aria-hidden />;
}
