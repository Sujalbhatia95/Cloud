import Link from "next/link";
import { PendingButton } from "@/components/admin/ConfirmButton";
import { Card, Notice, PageHeader, StatusBadge } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { getManualItems, runAutoChecks } from "@/lib/compliance";
import { formatDateTimeIST } from "@/lib/listings/format";
import { saveComplianceItemAction } from "../../actions/settings";

export default async function CompliancePage({ searchParams }: PageProps<"/admin/compliance">) {
  await requirePage("compliance");
  const sp = await searchParams;
  const [checks, manual] = await Promise.all([runAutoChecks(), getManualItems()]);
  const blockers = checks.filter((c) => c.level === "blocker").length;
  const warnings = checks.filter((c) => c.level === "warning").length;
  const manualOpen = manual.filter((m) => !m.done).length;
  const groups = Array.from(new Set(checks.map((c) => c.group)));
  const ready = blockers === 0 && manualOpen === 0;
  return (
    <>
      <PageHeader
        title="Compliance & launch checklist"
        description="Automatic checks plus items a person must confirm. This checklist helps you prepare — it is not legal advice and does not guarantee compliance. Have your disclosures reviewed by a qualified lawyer for your State/UT."
      />
      <Notice notice={sp.notice} error={sp.error} />
      <div className={`mb-8 border-l-4 p-5 ${ready ? "border-peacock bg-peacock-50" : "border-danger bg-danger-50"}`}>
        <p className={`font-display text-3xl ${ready ? "text-peacock" : "text-danger"}`}>
          {ready ? "Ready for launch review" : "Not ready for production launch"}
        </p>
        <p className="mt-1 text-sm">
          {blockers} blocker(s) · {warnings} warning(s) · {manualOpen} manual item(s) not yet confirmed.
        </p>
      </div>

      <div className="space-y-6">
        {groups.map((g) => (
          <Card key={g} title={g}>
            <ul className="divide-y divide-stone">
              {checks.filter((c) => c.group === g).map((c) => (
                <li key={c.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4">
                  <span className="w-24 shrink-0"><StatusBadge status={c.level} label={c.level === "ok" ? "OK" : c.level} /></span>
                  <div className="flex-1 text-sm">
                    <p className="font-semibold text-ink">{c.title}</p>
                    <p className="text-muted">{c.detail}</p>
                  </div>
                  {c.href && c.level !== "ok" ? <Link className="link shrink-0 text-sm" href={c.href}>Fix</Link> : null}
                </li>
              ))}
            </ul>
          </Card>
        ))}
        <section id="manual" className="scroll-mt-6">
          <Card title="Confirmed by a person">
            <ul className="divide-y divide-stone">
              {manual.map((m) => (
                <li key={m.key} className="py-3">
                  <form action={saveComplianceItemAction} className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <input type="hidden" name="key" value={m.key} />
                    <label className="flex flex-1 items-start gap-3 text-sm">
                      <input type="checkbox" name="done" defaultChecked={m.done} className="mt-1 h-4 w-4 accent-royal" />
                      <span>
                        {m.title}
                        {m.updatedBy ? <span className="block text-xs text-muted">Last updated by {m.updatedBy} {m.updatedAt ? formatDateTimeIST(m.updatedAt) : ""}</span> : null}
                      </span>
                    </label>
                    <input name="note" defaultValue={m.note} placeholder="Note / evidence (e.g. lawyer, date)" className="field lg:max-w-xs" maxLength={500} aria-label="Note" />
                    <PendingButton className="btn btn-outline btn-sm">Save</PendingButton>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>
    </>
  );
}
