"use client";

import { Boxes, BriefcaseBusiness, Building2, ChevronRight, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = readonly [label: string, href: string];
type NavSection = { label?: string; links: readonly NavLink[] };
type NavGroup = { label: string; icon: typeof Building2; sections: readonly NavSection[] };

export const adminNavGroups: readonly NavGroup[] = [
  { label: "Daily work", icon: Building2, sections: [
    { links: [["Overview", "/admin"], ["Quotations", "/admin/quotations"], ["Orders", "/admin/orders"], ["Payments", "/admin/payments"], ["Customers", "/admin/customers"], ["Customer support", "/admin/help-desk"]] },
  ] },
  { label: "Fulfilment", icon: Boxes, sections: [
    { links: [["Delivery", "/admin/delivery-notes"], ["Logistics", "/admin/logistics"], ["Returns", "/admin/returns"], ["Inventory", "/admin/inventory"]] },
  ] },
  { label: "Catalogue", icon: Boxes, sections: [
    { links: [["Products", "/admin/products"], ["Suppliers & feeds", "/admin/syntech"], ["Suppliers", "/admin/suppliers"]] },
  ] },
  { label: "Business", icon: BriefcaseBusiness, sections: [
    { links: [["Invoices", "/admin/invoices"], ["Reports", "/admin/reports"], ["Partnerships", "/admin/partnerships"], ["Marketing", "/admin/marketing"]] },
  ] },
  { label: "Settings", icon: Settings2, sections: [
    { links: [["Website content", "/admin/content"], ["Users & access", "/admin/access-control"], ["Audit log", "/admin/audit-log"]] },
  ] },
] as const;

type AdminNavProps = {
  permissions?: readonly string[];
  isSuperAdministrator?: boolean;
};

export const adminRoutePermissions: Record<string, string> = {
  "/admin": "reports.view",
  "/admin/customers": "customers.manage",
  "/admin/help-desk": "customers.manage",
  "/admin/calendar": "customers.manage",
  "/admin/quotations": "quotations.manage",
  "/admin/rfqs": "rfq.view",
  "/admin/invoices": "quotations.manage",
  "/admin/partnerships": "partnership.view",
  "/admin/partnerships/applications": "partnership.view",
  "/admin/partnerships/partners": "partnership.view",
  "/admin/partnerships/requests": "partnership.request.view",
  "/admin/partnerships/agreements": "partnership.view",
  "/admin/marketing": "marketing.dashboard.view",
  "/admin/marketing/analytics": "marketing.analytics.view",
  "/admin/marketing/homepage": "marketing.content.view",
  "/admin/marketing/combos": "combos.view",
  "/admin/marketing/blog": "marketing.content.view",
  "/admin/marketing/popups": "marketing.content.view",
  "/admin/marketing/media": "marketing.media.manage",
  "/admin/email-marketing": "customers.manage",
  "/admin/marketing/seo": "marketing.seo.view",
  "/admin/marketing/page-seo": "marketing.seo.view",
  "/admin/marketing/audit": "marketing.seo.view",
  "/admin/marketing/redirects": "marketing.redirects.manage",
  "/admin/orders": "orders.view",
  "/admin/payments": "payments.approve",
  "/admin/delivery-notes": "orders.view",
  "/admin/logistics": "transport.view",
  "/admin/returns": "returns.view",
  "/admin/returns/fulfilment": "returns.view",
  "/admin/returns/claims": "returns.claims.manage",
  "/admin/returns/documents": "returns.documents.download",
  "/admin/inventory": "inventory.manage",
  "/admin/suppliers": "products.update",
  "/admin/products": "products.view",
  "/admin/categories": "products.update",
  "/admin/brands": "products.update",
  "/admin/promotions": "settings.manage",
  "/admin/reports": "reports.view",
  "/admin/returns/profitability": "returns.financial.view",
  "/admin/syntech": "products.update",
  "/admin/syntech/products": "products.view",
  "/admin/documents": "documents.history.view",
  "/admin/content": "settings.manage",
  "/admin/reviews": "products.update",
  "/admin/access-control": "users.manage",
  "/admin/audit-log": "users.manage",
};

export function AdminNav({ permissions = [], isSuperAdministrator = false }: AdminNavProps) {
  const pathname = usePathname();
  const grants = new Set(permissions);
  const canShow = (href: string) => href === "/admin/test-mode"
    ? isSuperAdministrator
    : isSuperAdministrator || grants.has(adminRoutePermissions[href] ?? "");
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
    {(isSuperAdministrator||grants.has("reports.view"))?<div className="mt-4 border-t border-white/10 pt-3"><Link className="flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-sky-300 hover:bg-white/[.07] hover:text-white" href="/api/admin/system-guide" target="_blank">Download system guide PDF</Link></div>:null}
  </nav>;
}
