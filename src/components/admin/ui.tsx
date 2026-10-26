import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-stone pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-4xl text-navy">{title}</h1>
        {description ? <div className="mt-1 max-w-3xl text-sm text-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Notice({ notice, error }: { notice?: string | string[]; error?: string | string[] }) {
  const n = Array.isArray(notice) ? notice[0] : notice;
  const e = Array.isArray(error) ? error[0] : error;
  if (!n && !e) return null;
  return (
    <div
      role={e ? "alert" : "status"}
      className={`mb-6 border-l-4 px-4 py-3 text-sm ${e ? "border-danger bg-danger-50 text-danger" : "border-peacock bg-peacock-50 text-peacock"}`}
    >
      {e ?? n}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`border border-stone bg-white ${className}`}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-stone px-5 py-3.5">
          <h2 className="font-sans text-sm font-bold uppercase tracking-[0.12em] text-ink">{title}</h2>
          {actions}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, href, tone = "default" }: { label: string; value: ReactNode; href?: string; tone?: "default" | "warn" | "bad" | "good" }) {
  const toneCls = tone === "bad" ? "text-danger" : tone === "warn" ? "text-gold-700" : tone === "good" ? "text-peacock" : "text-navy";
  const body = (
    <>
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-1 font-display text-4xl ${toneCls}`}>{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className="block border border-stone bg-white p-5 transition-colors hover:border-royal">
      {body}
    </Link>
  ) : (
    <div className="border border-stone bg-white p-5">{body}</div>
  );
}

const STATUS_TONES: Record<string, string> = {
  active: "badge-green",
  under_offer: "badge-gold",
  sold: "badge-muted",
  rented: "badge-muted",
  archived: "badge-muted",
  draft: "badge-muted",
  new: "badge-blue",
  contacted: "badge-gold",
  scheduled: "badge-green",
  completed: "badge-muted",
  closed: "badge-muted",
  cancelled: "badge-muted",
  spam: "badge-red",
  sent: "badge-green",
  pending: "badge-gold",
  sending: "badge-gold",
  failed: "badge-red",
  uploaded: "badge-gold",
  previewed: "badge-blue",
  ok: "badge-green",
  warning: "badge-gold",
  blocker: "badge-red",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={`badge ${STATUS_TONES[status] ?? "badge-muted"}`}>{label ?? status.replace(/_/g, " ")}</span>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-stone bg-white">
      <table className="w-full min-w-[640px] text-left text-sm [&_td]:border-t [&_td]:border-stone [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_th]:bg-sand [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-[0.7rem] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.1em] [&_th]:text-muted">
        {children}
      </table>
    </div>
  );
}

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-muted">
        {text}
      </td>
    </tr>
  );
}

export function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}
