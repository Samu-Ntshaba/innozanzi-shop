"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";

const links = [
  ["Overview", "/account", "⌂"],
  ["Profile", "/account/profile", "●"],
  ["Delivery addresses", "/account/addresses", "⌖"],
  ["My PC Projects", "/account/pc-projects", "PC"],
  ["Orders & tracking", "/account/orders", "↗"],
  ["Quotations", "/account/quotations", "Q"],
  ["Returns & concerns", "/account/returns", "↩"],
  ["Support", "/account/support", "?"],
  ["Partnership", "/account/partnership", "◇"],
] as const;

export function AccountNav({ showAdmin }: { showAdmin: boolean }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || (href !== "/account" && pathname.startsWith(href + "/"));
  const current = links.find(([, href]) => active(href))?.[0] ?? "Account menu";
  const items = <>
    {links.map(([label, href, icon]) => (
      <Link
        aria-current={active(href) ? "page" : undefined}
        className={`flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${active(href) ? "bg-sky-50 text-sky-800 ring-1 ring-sky-200" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
        href={href}
        key={href}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-black">{icon}</span>
        <span className="min-w-0">{label}</span>
      </Link>
    ))}
    {showAdmin ? <Link className="flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-50" href="/admin"><span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sky-100 text-xs">A</span><span>Admin workspace</span></Link> : null}
  </>;
  return (
    <>
      <details className="group border-t border-slate-100 p-3 lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-800 [&::-webkit-details-marker]:hidden"><Menu className="size-5 shrink-0 text-sky-700"/><span className="min-w-0 flex-1 truncate">{current}</span><ChevronDown className="size-4 shrink-0 transition group-open:rotate-180"/></summary>
        <nav aria-label="Customer account" className="mt-2 grid gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">{items}</nav>
      </details>
      <nav aria-label="Customer account" className="hidden space-y-1 p-3 lg:block">{items}</nav>
    </>
  );
}
