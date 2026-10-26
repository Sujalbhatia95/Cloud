import Link from "next/link";
import { Notice, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { getContentPage, renderTokens, unresolvedPlaceholders } from "@/lib/content/pages";
import type { PageSlug } from "@/lib/content/defaults";
import { formatDateTimeIST } from "@/lib/listings/format";
import { getSettings } from "@/lib/settings";

const SLUGS: PageSlug[] = ["privacy", "terms", "disclosures", "about"];

export default async function ContentList({ searchParams }: PageProps<"/admin/content">) {
  await requirePage("content");
  const sp = await searchParams;
  const settings = await getSettings();
  const pages = await Promise.all(SLUGS.map((s) => getContentPage(s)));
  return (
    <>
      <PageHeader title="Legal & page content" description="Edit the text of the Privacy Notice, Terms, Disclosures and About pages. Drafts are provided for review by a qualified lawyer." />
      <Notice notice={sp.notice} error={sp.error} />
      <Table>
        <thead><tr><th>Page</th><th>Legal review</th><th>Placeholders remaining</th><th>Last edited</th><th /></tr></thead>
        <tbody>
          {pages.map((p) => {
            const left = unresolvedPlaceholders(renderTokens(p.bodyMd, settings, p.updatedAt)).length;
            return (
              <tr key={p.slug}>
                <td className="font-semibold">{p.title} <span className="font-mono text-xs text-muted">/{p.slug}</span></td>
                <td>{p.slug === "about" ? "—" : <StatusBadge status={p.legalReviewed ? "ok" : "blocker"} label={p.legalReviewed ? "Reviewed" : "Draft"} />}</td>
                <td>{left ? <StatusBadge status="warning" label={`${left}`} /> : <StatusBadge status="ok" label="None" />}</td>
                <td className="text-xs">{p.updatedAt ? formatDateTimeIST(p.updatedAt) : "Default text"}</td>
                <td className="text-right"><Link className="btn btn-outline btn-sm" href={`/admin/content/${p.slug}`}>Edit</Link></td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}
