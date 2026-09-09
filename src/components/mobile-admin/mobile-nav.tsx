"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [["Today","/mobile-admin","⌂"],["Orders","/mobile-admin/orders","▤"],["Inbox","/mobile-admin/inbox","●"],["Stock","/mobile-admin/stock","▦"],["Analytics","/mobile-admin/analytics","↗"]] as const;
export function MobileAdminNav() { const path=usePathname(); return <nav aria-label="Mobile Admin" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"><div className="mx-auto grid max-w-2xl grid-cols-5">{links.map(([label,href,icon])=>{const active=href==="/mobile-admin"?path===href:path.startsWith(href);return <Link key={href} href={href} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold ${active?"text-sky-700":"text-slate-500"}`}><span className="text-lg leading-none">{icon}</span>{label}</Link>})}</div></nav> }
