"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const adminNavGroups = [
  ["CRM", [["Overview", "/admin"], ["Ticketing centre", "/admin/help-desk"], ["Operations calendar", "/admin/calendar"], ["Customers", "/admin/customers"], ["Quote pipeline", "/admin/quotations"], ["RFQs & tenders", "/admin/rfqs"], ["Invoices", "/admin/invoices"]]],
  ["Partnerships", [["Dashboard", "/admin/partnerships"], ["Applications", "/admin/partnerships/applications"], ["Approved partners", "/admin/partnerships/partners"], ["Partner requests", "/admin/partnerships/requests"]]],
  ["Marketing", [["Dashboard", "/admin/marketing"],["Homepage", "/admin/marketing/homepage"],["Global SEO", "/admin/marketing/seo"],["Page SEO", "/admin/marketing/page-seo"],["SEO audit", "/admin/marketing/audit"],["Redirects", "/admin/marketing/redirects"],["Media library", "/admin/marketing/media"],["Email marketing", "/admin/email-marketing"]]],
  ["Operations", [["Orders", "/admin/orders"], ["Logistics & transport", "/admin/logistics"], ["Returns & refunds", "/admin/returns"], ["Delivery notes", "/admin/delivery-notes"], ["Payments", "/admin/payments"], ["Inventory", "/admin/inventory"], ["Suppliers", "/admin/suppliers"]]],
  ["Catalogue", [["Products", "/admin/products"], ["Categories", "/admin/categories"], ["Brands", "/admin/brands"], ["Promotions", "/admin/promotions"]]],
  ["Intelligence", [["Reports", "/admin/reports"], ["Syntech AI Sync", "/admin/syntech"]]],
  ["System", [["Document centre", "/admin/documents"],["Content", "/admin/content"], ["Reviews", "/admin/reviews"], ["Test Mode", "/admin/test-mode"], ["Access control", "/admin/access-control"], ["Audit log", "/admin/audit-log"]]],
] as const;

export function AdminNav({ canViewRfqs = false, canViewMarketing=false,canViewDocuments=false,canViewReturns=false,canViewTransport=false, canManageUsers = false, isSuperAdministrator = false }: { canViewRfqs?: boolean;canViewMarketing?:boolean;canViewDocuments?:boolean;canViewReturns?:boolean;canViewTransport?:boolean; canManageUsers?: boolean; isSuperAdministrator?:boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => href === "/admin" ? pathname === href : pathname.startsWith(href);
  return <nav aria-label="Administration" className="p-3">
    {adminNavGroups.map(([group, links]) => {
      const visibleLinks = links.filter(([, href]) => href.startsWith("/admin/marketing")||href==="/admin/email-marketing"?canViewMarketing:href.startsWith("/admin/documents")?canViewDocuments:href.startsWith("/admin/returns")?canViewReturns:href.startsWith("/admin/logistics")?canViewTransport:href === "/admin/rfqs" ? canViewRfqs : href === "/admin/test-mode" ? isSuperAdministrator : href !== "/admin/access-control" || canManageUsers);
      if (!visibleLinks.length) return null;
      const containsActivePage = visibleLinks.some(([, href]) => isActive(href));
      return <details className="group mb-2 border-b border-white/10 pb-2" open={containsActivePage || undefined} key={group}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400 hover:bg-white/5 hover:text-white [&::-webkit-details-marker]:hidden">
          {group}<span aria-hidden="true" className="text-base leading-none transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="mt-1 space-y-0.5">{visibleLinks.map(([label, href]) => <Link aria-current={isActive(href) ? "page" : undefined} className={`block border-l-2 px-3 py-2 text-sm transition-colors ${isActive(href) ? "border-sky-400 bg-sky-500/15 font-semibold text-white" : "border-transparent text-slate-300 hover:border-sky-400 hover:bg-white/10 hover:text-white"}`} href={href} key={href}>{label}</Link>)}</div>
      </details>;
    })}
  </nav>;
}
