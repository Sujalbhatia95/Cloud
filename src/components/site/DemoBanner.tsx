import Link from "next/link";
import { getSettings } from "@/lib/settings";

export async function DemoBanner() {
  const s = await getSettings();
  if (!s.demoMode) return null;
  return (
    <div role="note" className="border-b border-amber-300 bg-demo-50 text-demo">
      <p className="container-page py-2 text-center text-[0.78rem] leading-snug">
        <strong className="font-bold uppercase tracking-wider">Demo mode</strong> · Listings marked <strong>DEMO</strong> are illustrative
        samples, not real properties. Details in <strong>[brackets]</strong> are placeholders awaiting verification.{" "}
        <Link href="/disclosures" className="underline underline-offset-2">Learn more</Link>
      </p>
    </div>
  );
}
