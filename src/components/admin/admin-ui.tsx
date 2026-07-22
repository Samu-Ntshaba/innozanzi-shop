import type { ReactNode } from "react";

export function AdminPage({ title, description, actions, children }: { title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  return <section className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-600">{description}</p></div>{actions}</header>{children}</section>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export const inputClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
export const buttonClass = "rounded-lg bg-[#071b33] px-4 py-2 text-sm font-semibold text-white hover:bg-sky-900";
export const tableClass = "w-full min-w-[700px] text-left text-sm [&_th]:border-b [&_th]:border-slate-200 [&_th]:px-3 [&_th]:py-3 [&_th]:font-semibold [&_td]:border-b [&_td]:border-slate-100 [&_td]:px-3 [&_td]:py-3";
