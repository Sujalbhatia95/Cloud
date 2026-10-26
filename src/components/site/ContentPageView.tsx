import { getContentPage, LEGAL_SLUGS, renderTokens } from "@/lib/content/pages";
import type { PageSlug } from "@/lib/content/defaults";
import { getSettings } from "@/lib/settings";
import { IconAlert } from "@/components/ui/icons";
import { Markdown } from "./Markdown";

export async function ContentPageView({ slug, eyebrow }: { slug: PageSlug; eyebrow: string }) {
  const [page, settings] = await Promise.all([getContentPage(slug), getSettings()]);
  const md = renderTokens(page.bodyMd, settings, page.legalReviewed ? page.updatedAt : null);
  const isLegal = LEGAL_SLUGS.includes(slug);
  return (
    <div className="container-page max-w-3xl py-14 lg:py-20">
      {isLegal && !page.legalReviewed ? (
        <div role="note" className="mb-8 flex gap-3 border border-amber-300 bg-demo-50 p-4 text-sm text-demo">
          <IconAlert size={20} className="mt-0.5 shrink-0" />
          <p>
            <strong>Draft for legal review.</strong> This text was prepared as a starting point and has not yet been approved by a qualified
            lawyer. Highlighted items in brackets still need verified information.
          </p>
        </div>
      ) : null}
      <p className="eyebrow">{eyebrow}</p>
      <span className="hairline mt-3" />
      <h1 className="mb-8 mt-4 text-5xl text-navy sm:text-6xl">{page.title}</h1>
      <Markdown source={md} />
    </div>
  );
}

export function ContentSkeleton() {
  return (
    <div className="container-page max-w-3xl space-y-4 py-14" role="status" aria-label="Loading">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-14 w-2/3" />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="skeleton h-4 w-full" />
      ))}
    </div>
  );
}
