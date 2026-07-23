import Link from "next/link";
import type { ReactNode } from "react";
import { AdminBreadcrumbs } from "./admin-breadcrumbs";

export function AdminPage({
  title,
  description,
  actions,
  eyebrow = "Innozanzi Business Suite",
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-300 pb-4">
        <div className="min-w-0">
          <AdminBreadcrumbs />
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-sky-700">{eyebrow}</p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function Panel({
  children,
  className = "",
  title,
  description,
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={`overflow-x-auto border border-slate-300 bg-white shadow-sm ${className}`}>
      {title || description || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            {title ? <h2 className="font-semibold text-slate-950">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div className={title || description || actions ? "p-4" : "p-4"}>{children}</div>
    </section>
  );
}

const positive = ["PAID", "ACCEPTED", "APPROVED", "ISSUED", "COMPLETED", "VERIFIED", "WON", "DELIVERED", "ACTIVE"];
const attention = ["PENDING", "OPEN", "IN_REVIEW", "UNDER_REVIEW", "PENDING_APPROVAL", "AWAITING_APPROVAL", "DRAFT", "SUBMITTED", "RECEIVED"];
const negative = ["REJECTED", "FAILED", "CANCELLED", "SUSPENDED", "TERMINATED", "EXPIRED", "LOST"];

export function formatAdminLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

export function StatusBadge({ value }: { value: string }) {
  const tone = positive.includes(value)
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : attention.includes(value)
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : negative.includes(value)
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : "border-slate-300 bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-1 text-[11px] font-semibold ${tone}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {formatAdminLabel(value)}
    </span>
  );
}

export function MetricCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="border border-slate-300 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="px-5 py-10 text-center">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  query = {},
}: {
  page: number;
  pageCount: number;
  total: number;
  query?: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return <p className="text-xs text-slate-500">{total} record{total === 1 ? "" : "s"}</p>;
  const href = (target: number) => {
    const parameters = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => value && parameters.set(key, value));
    parameters.set("page", String(target));
    return `?${parameters.toString()}`;
  };
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-xs text-slate-500">
        {total} records · Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? <Link className={secondaryButtonClass} href={href(page - 1)}>Previous</Link> : <span className={`${secondaryButtonClass} cursor-not-allowed opacity-40`}>Previous</span>}
        {page < pageCount ? <Link className={secondaryButtonClass} href={href(page + 1)}>Next</Link> : <span className={`${secondaryButtonClass} cursor-not-allowed opacity-40`}>Next</span>}
      </div>
    </nav>
  );
}

export const inputClass =
  "min-h-10 rounded-sm border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-700 focus:ring-2 focus:ring-sky-700/20 disabled:cursor-not-allowed disabled:bg-slate-100";
export const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-sm bg-[#0a6ed1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#085caf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-sm border border-slate-400 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-sky-600 hover:text-sky-700";
export const dangerButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-sm border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100";
export const tableClass =
  "w-full min-w-[720px] border-collapse text-left text-sm [&_thead]:bg-slate-100 [&_th]:border-b [&_th]:border-slate-300 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-[10px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-slate-600 [&_td]:border-b [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_tbody_tr:hover]:bg-sky-50/60 [&_tbody_tr:last-child_td]:border-b-0";
