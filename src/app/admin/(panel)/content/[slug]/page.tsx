import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton, PendingButton } from "@/components/admin/ConfirmButton";
import { Card, Notice, PageHeader } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { CONTENT_TOKENS, type PageSlug } from "@/lib/content/defaults";
import { getContentPage, LEGAL_SLUGS, renderTokens, unresolvedPlaceholders } from "@/lib/content/pages";
import { getSettings } from "@/lib/settings";
import { resetContentAction, saveContentAction } from "../../../actions/settings";

export default async function EditContent({ params, searchParams }: PageProps<"/admin/content/[slug]">) {
  await requirePage("content");
  const { slug } = await params;
  const sp = await searchParams;
  if (!["privacy", "terms", "disclosures", "about"].includes(slug)) notFound();
  const page = await getContentPage(slug as PageSlug);
  const settings = await getSettings();
  const left = unresolvedPlaceholders(renderTokens(page.bodyMd, settings, page.updatedAt));
  const legal = LEGAL_SLUGS.includes(slug as PageSlug);
  return (
    <>
      <PageHeader
        title={`Edit: ${page.title}`}
        description="Written in Markdown (## for headings, - for bullet points, **bold**). Tokens in {{double braces}} are filled from Business settings."
        actions={<Link href={`/${slug}`} target="_blank" className="btn btn-outline btn-sm">View page ↗</Link>}
      />
      <Notice notice={sp.notice} error={sp.error} />
      {left.length ? (
        <div className="mb-6 border-l-4 border-gold bg-gold-100 p-4 text-sm text-gold-700">
          <p className="font-semibold">{left.length} placeholder(s) are still visible on this page:</p>
          <ul className="mt-1 list-disc pl-5">{left.slice(0, 12).map((l) => <li key={l}>{l}</li>)}</ul>
          <p className="mt-2">Fill them in <Link className="underline" href="/admin/settings">Business settings</Link>, or edit the text below.</p>
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <form action={saveContentAction} className="space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <label className="block">
            <span className="field-label">Page title</span>
            <input name="title" defaultValue={page.title} className="field" maxLength={120} />
          </label>
          <label className="block">
            <span className="field-label">Page text (Markdown)</span>
            <textarea name="bodyMd" defaultValue={page.bodyMd} className="field font-mono text-xs leading-relaxed" rows={30} />
          </label>
          {legal ? (
            <div className="border border-stone bg-white p-4">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="legalReviewed" defaultChecked={page.legalReviewed} className="mt-1 accent-royal" />
                <span>This text has been reviewed and approved by a qualified lawyer. (Removes the &ldquo;Draft for legal review&rdquo; banner and sets the &ldquo;last updated&rdquo; date.)</span>
              </label>
              <input name="reviewNote" placeholder="Reviewer and date (internal note)" className="field mt-3" maxLength={500} />
            </div>
          ) : null}
          <PendingButton className="btn btn-primary" pendingText="Saving…">Save and publish</PendingButton>
        </form>
        <aside className="space-y-6">
          <Card title="Available tokens">
            <ul className="space-y-2 text-xs">
              {Object.entries(CONTENT_TOKENS).map(([k, v]) => (
                <li key={k}><code className="bg-sand px-1">{`{{${k}}}`}</code><br /><span className="text-muted">{v}</span></li>
              ))}
            </ul>
          </Card>
          {!page.isDefault ? (
            <form action={resetContentAction}>
              <input type="hidden" name="slug" value={slug} />
              <ConfirmButton message="Replace this page with the original draft text? Your edits will be lost.">Restore default draft</ConfirmButton>
            </form>
          ) : null}
        </aside>
      </div>
    </>
  );
}
