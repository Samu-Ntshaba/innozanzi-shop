"use client";

import { BarChart3, Boxes, BriefcaseBusiness, Building2, ChevronRight, Megaphone, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = readonly [label: string, href: string];
type NavSection = { label?: string; links: readonly NavLink[] };
type NavGroup = { label: string; icon: typeof Building2; sections: readonly NavSection[] };

export const adminNavGroups: readonly NavGroup[] = [
  { label: "Customers & sales", icon: Building2, sections: [
    { links: [["Overview", "/admin"]] },
    { label: "Customer service", links: [["Customers", "/admin/customers"], ["Ticketing centre", "/admin/help-desk"], ["Operations calendar", "/admin/calendar"]] },
    { label: "Sales", links: [["Quote pipeline", "/admin/quotations"], ["RFQs & tenders", "/admin/rfqs"], ["Invoices", "/admin/invoices"]] },
  ] },
  { label: "Partnerships", icon: BriefcaseBusiness, sections: [
    { links: [["Overview", "/admin/partnerships"]] },
    { label: "Management", links: [["Applications", "/admin/partnerships/applications"], ["Approved partners", "/admin/partnerships/partners"], ["Partner requests", "/admin/partnerships/requests"], ["Agreements", "/admin/partnerships/agreements"]] },
  ] },
  { label: "Marketing", icon: Megaphone, sections: [
    { links: [["Overview", "/admin/marketing"], ["Analytics", "/admin/marketing/analytics"]] },
    { label: "Content", links: [["Homepage", "/admin/marketing/homepage"], ["Blog", "/admin/marketing/blog"], ["Website popups", "/admin/marketing/popups"], ["Media library", "/admin/marketing/media"], ["Email marketing", "/admin/email-marketing"]] },
    { label: "Search & discovery", links: [["Global SEO", "/admin/marketing/seo"], ["Page SEO", "/admin/marketing/page-seo"], ["SEO audit", "/admin/marketing/audit"], ["Redirects", "/admin/marketing/redirects"]] },
  ] },
  { label: "Operations", icon: Boxes, sections: [
    { label: "Order fulfilment", links: [["Orders", "/admin/orders"], ["Payments", "/admin/payments"], ["Delivery notes", "/admin/delivery-notes"], ["Logistics & transport", "/admin/logistics"]] },
    { label: "Returns", links: [["Returns & refunds", "/admin/returns"], ["Return fulfilment", "/admin/returns/fulfilment"], ["Distributor claims", "/admin/returns/claims"], ["Return documents", "/admin/returns/documents"]] },
    { label: "Supply", links: [["Inventory", "/admin/inventory"], ["Suppliers", "/admin/suppliers"]] },
  ] },
  { label: "Catalogue", icon: Boxes, sections: [
    { links: [["Products", "/admin/products"], ["Categories", "/admin/categories"], ["Brands", "/admin/brands"], ["Promotions", "/admin/promotions"]] },
  ] },
  { label: "Reports & intelligence", icon: BarChart3, sections: [
    { links: [["Business reports", "/admin/reports"], ["Return profitability", "/admin/returns/profitability"], ["Syntech AI Sync", "/admin/syntech"]] },
  ] },
  { label: "System", icon: Settings2, sections: [
    { label: "Records", links: [["Document centre", "/admin/documents"], ["Content", "/admin/content"], ["Reviews", "/admin/reviews"]] },
    { label: "Administration", links: [["Access control", "/admin/access-control"], ["Audit log", "/admin/audit-log"], ["Test mode", "/admin/test-mode"]] },
  ] },
] as const;

type AdminNavProps = {
  canViewRfqs?: boolean;
  canViewMarketing?: boolean;
  canViewDocuments?: boolean;
  canViewReturns?: boolean;
  canViewTransport?: boolean;
  canManageUsers?: boolean;
  isSuperAdministrator?: boolean;
};

export function AdminNav({ canViewRfqs = false, canViewMarketing = false, canViewDocuments = false, canViewReturns = false, canViewTransport = false, canManageUsers = false, isSuperAdministrator = false }: AdminNavProps) {
  const pathname = usePathname();
  const canShow = (href: string) =>
    href.startsWith("/admin/marketing") || href === "/admin/email-marketing" ? canViewMarketing
      : href.startsWith("/admin/documents") ? canViewDocuments
        : href.startsWith("/admin/returns") ? canViewReturns
          : href.startsWith("/admin/logistics") ? canViewTransport
            : href === "/admin/rfqs" ? canViewRfqs
              : href === "/admin/test-mode" ? isSuperAdministrator
                : href !== "/admin/access-control" || canManageUsers;
  const visibleHrefs = adminNavGroups.flatMap((group) => group.sections.flatMap((section) => section.links.map(([, href]) => href))).filter(canShow);
  const activeHref = visibleHrefs
    .filter((href) => href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return <nav aria-label="Administration" className="space-y-1 p-3">
    {adminNavGroups.map((group) => {
      const sections = group.sections.map((section) => ({ ...section, links: section.links.filter(([, href]) => canShow(href)) })).filter((section) => section.links.length);
      if (!sections.length) return null;
      const groupActive = sections.some((section) => section.links.some(([, href]) => href === activeHref));
      const Icon = group.icon;
      return <details className="group/nav overflow-hidden rounded-lg" open={groupActive || undefined} key={group.label}>
        <summary className={`flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg px-3 text-sm font-semibold transition [&::-webkit-details-marker]:hidden ${groupActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/[.07] hover:text-white"}`}>
          <Icon className={`size-4 shrink-0 ${groupActive ? "text-sky-300" : "text-slate-400"}`} />
          <span className="min-w-0 flex-1 truncate">{group.label}</span>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-slate-500 transition-transform group-open/nav:rotate-90" />
        </summary>
        <div className="mb-2 ml-5 mt-1 border-l border-white/10 pl-3">
          {sections.map((section, sectionIndex) => <div className={sectionIndex ? "mt-3" : ""} key={section.label ?? `primary-${sectionIndex}`}>
            {section.label ? <p className="mb-1 px-2 text-[9px] font-bold uppercase tracking-[.15em] text-slate-500">{section.label}</p> : null}
            <div className="space-y-0.5">{section.links.map(([label, href]) => {
              const active = href === activeHref;
              return <Link aria-current={active ? "page" : undefined} className={`relative flex min-h-9 items-center rounded-md px-3 text-[13px] transition ${active ? "bg-sky-500/15 font-semibold text-white before:absolute before:-left-[13px] before:h-5 before:w-0.5 before:bg-sky-400" : "text-slate-400 hover:bg-white/[.06] hover:text-slate-100"}`} href={href} key={href}>{label}</Link>;
            })}</div>
          </div>)}
        </div>
      </details>;
    })}
  </nav>;
}
