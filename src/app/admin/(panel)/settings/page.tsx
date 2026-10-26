import { eq, sql } from "drizzle-orm";
import { ConfirmButton, PendingButton } from "@/components/admin/ConfirmButton";
import { Card, Notice, PageHeader } from "@/components/admin/ui";
import { getDb, schema } from "@/db";
import { requirePage } from "@/lib/auth/guards";
import { INDIAN_STATES_AND_UTS } from "@/lib/listings/constants";
import { getSettings } from "@/lib/settings";
import { RERA_PLACEHOLDER } from "@/lib/settings-schema";
import { deleteDemoListingsAction, saveSettingsAction, setDemoModeAction } from "../../actions/settings";

function Field({ name, label, value, hint, type = "text", wide = false, textarea = false }: { name: string; label: string; value: string | number; hint?: string; type?: string; wide?: boolean; textarea?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="field-label">{label}</span>
      {textarea ? (
        <textarea name={name} defaultValue={String(value)} className="field" rows={3} />
      ) : (
        <input name={name} type={type} defaultValue={String(value)} className="field" />
      )}
      {hint ? <span className="field-hint block">{hint}</span> : null}
    </label>
  );
}

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  await requirePage("settings");
  const sp = await searchParams;
  const s = await getSettings();
  const [{ demo }] = await getDb().select({ demo: sql<number>`count(*)::int` }).from(schema.listings).where(eq(schema.listings.isDemo, true));
  return (
    <>
      <PageHeader
        title="Business settings"
        description={<>Shown in the footer, contact page, property pages and legal pages. Anything left blank is shown publicly as a placeholder such as <span className="placeholder-text">{RERA_PLACEHOLDER}</span>. Only enter verified information.</>}
      />
      <Notice notice={sp.notice} error={sp.error} />

      <form action={saveSettingsAction} className="space-y-6">
        <Card title="Business details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="business.name" label="Trading name" value={s.business.name} />
            <Field name="business.legalName" label="Registered legal name" value={s.business.legalName} hint="As on your registration / GST documents." />
            <Field name="business.entityType" label="Entity type" value={s.business.entityType} hint="e.g. Sole proprietorship, Partnership firm, LLP, Private limited company" />
            <Field name="business.gstin" label="GSTIN (if registered)" value={s.business.gstin} />
            <Field name="business.email" label="Public email" value={s.business.email} type="email" />
            <Field name="business.phone" label="Phone" value={s.business.phone} />
            <Field name="business.whatsapp" label="WhatsApp number (with country code)" value={s.business.whatsapp} />
            <Field name="business.officeHours" label="Office hours" value={s.business.officeHours} hint="e.g. Mon–Sat, 10 am – 7 pm" />
            <Field name="business.addressLine" label="Office address (building, street, area)" value={s.business.addressLine} wide />
            <Field name="business.city" label="City" value={s.business.city} hint="Also used as the city for courts' jurisdiction in the Terms." />
            <label className="block">
              <span className="field-label">State / UT</span>
              <select name="business.state" defaultValue={s.business.state} className="field">
                <option value="">—</option>
                {INDIAN_STATES_AND_UTS.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
            </label>
            <Field name="business.pincode" label="PIN code" value={s.business.pincode} />
          </div>
        </Card>

        <Card title="Jurisdiction & RERA">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">State / UT where you operate</span>
              <select name="operatingState" defaultValue={s.operatingState} className="field">
                <option value="">— not set —</option>
                {INDIAN_STATES_AND_UTS.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
              <span className="field-hint block">Determines which State RERA authority and rules apply. If you operate in several, list the others in the Disclosures page.</span>
            </label>
            <label className="block">
              <span className="field-label">RERA agent registration status</span>
              <select name="rera.agentStatus" defaultValue={s.rera.agentStatus} className="field">
                <option value="unset">Not yet confirmed</option>
                <option value="registered">Registered as a real estate agent</option>
                <option value="not_required">Not required (based on written legal advice)</option>
              </select>
            </label>
            <Field name="rera.agentRegistrationNumber" label="RERA agent registration number" value={s.rera.agentRegistrationNumber} hint="Copy exactly from your registration certificate." />
            <Field name="rera.validUntil" label="Registration valid until" value={s.rera.validUntil} type="date" />
            <Field name="rera.authorityName" label="RERA authority name" value={s.rera.authorityName} hint="The full official name of your State/UT authority." />
            <Field name="rera.authorityWebsite" label="RERA authority website" value={s.rera.authorityWebsite} hint="Official https address — verify it yourself." />
            <Field name="rera.notRequiredReason" label="If not required: reason and who advised" value={s.rera.notRequiredReason} wide textarea />
          </div>
        </Card>

        <Card title="Brokerage / commission disclosures">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="brokerage.sale" label="Sales" value={s.brokerage.sale} textarea hint="e.g. “X% of the sale price + GST, payable by the buyer on registration, under a written agreement.”" />
            <Field name="brokerage.rent" label="Rentals / leases" value={s.brokerage.rent} textarea />
            <Field name="brokerage.commercial" label="Commercial (if different)" value={s.brokerage.commercial} textarea />
            <Field name="brokerage.notes" label="Other notes (shown on the Disclosures page)" value={s.brokerage.notes} textarea />
          </div>
        </Card>

        <Card title="Privacy & grievance officer">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="privacy.grievanceOfficerName" label="Grievance Officer name" value={s.privacy.grievanceOfficerName} />
            <Field name="privacy.grievanceOfficerEmail" label="Grievance Officer email" value={s.privacy.grievanceOfficerEmail} type="email" />
            <Field name="privacy.grievanceOfficerPhone" label="Grievance Officer phone" value={s.privacy.grievanceOfficerPhone} />
            <Field name="privacy.retentionDays" label="Keep enquiries for (days)" value={s.privacy.retentionDays} type="number" hint="30–3650. Older enquiries are deleted by the daily maintenance job." />
          </div>
        </Card>
        <div className="sticky bottom-0 -mx-4 border-t border-stone bg-ivory/95 px-4 py-3 backdrop-blur">
          <PendingButton className="btn btn-primary" pendingText="Saving…">Save settings</PendingButton>
        </div>
      </form>

      <section id="demo" className="mt-10 scroll-mt-6">
        <Card title="Demo mode">
          <p className="text-sm">
            Demo mode is <strong>{s.demoMode ? "ON" : "OFF"}</strong>. When on, demo listings (marked DEMO, with computer-generated images) and a demo banner
            are shown publicly. Turn it off before launch. {demo} demo listing(s) are in the database.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={setDemoModeAction}>
              {!s.demoMode ? <input type="hidden" name="demoMode" value="on" /> : null}
              <ConfirmButton
                message={s.demoMode ? "Turn demo mode OFF? Demo listings and the demo banner will be hidden from the public." : "Turn demo mode ON? Demo listings will become visible to the public."}
                className={`btn btn-sm ${s.demoMode ? "btn-primary" : "btn-outline"}`}
              >
                {s.demoMode ? "Turn demo mode off" : "Turn demo mode on"}
              </ConfirmButton>
            </form>
            {demo > 0 ? (
              <form action={deleteDemoListingsAction}>
                <ConfirmButton message={`Permanently delete all ${demo} demo listings?`} className="btn btn-sm text-danger">
                  Delete all demo listings
                </ConfirmButton>
              </form>
            ) : null}
          </div>
        </Card>
      </section>
    </>
  );
}
