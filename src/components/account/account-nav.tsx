"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["Overview", "/account", "⌂"],
  ["Quotations", "/account/quotations", "Q"],
  ["Orders & tracking", "/account/orders", "↗"],
  ["Returns & concerns", "/account/returns", "↩"],
  ["Support", "/account/support", "?"],
  ["Partnership", "/account/partnership", "◇"],
] as const;

export function AccountNav({ showAdmin }: { showAdmin: boolean }) {
  const pathname = usePathname();
  const active = (href: string) => href === "/account" ? pathname === href : pathname.startsWith(href);
  return (
    <nav aria-label="Customer account" className="flex gap-1 overflow-x-auto p-2 lg:block lg:space-y-1 lg:p-3">
      {links.map(([label, href, icon]) => (
        <Link
          aria-current={active(href) ? "page" : undefined}
          className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${active(href) ? "bg-sky-50 text-sky-800 ring-1 ring-sky-200" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
          href={href}
          key={href}
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-xs font-black">{icon}</span>
          {label}
        </Link>
      ))}
      {showAdmin ? <Link className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-50" href="/admin"><span className="flex size-7 items-center justify-center rounded-md bg-sky-100 text-xs">A</span>Admin workspace</Link> : null}
    </nav>
  );
}
