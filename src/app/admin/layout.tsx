import { BrandLogo } from "@/components/brand-logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { logoutAction } from "@/app/(auth)/actions";
import { requireUser } from "@/domain/auth/session";
import { hasPermission } from "@/domain/auth/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const context = await requireUser();
  const { user } = context;
  const canViewRfqs = hasPermission(context.grants, "rfq.view", context.isSuperAdministrator);
  const canManageUsers = hasPermission(context.grants, "users.manage", context.isSuperAdministrator);
  const canViewMarketing = hasPermission(context.grants, "marketing.dashboard.view", context.isSuperAdministrator);
  const canViewDocuments = hasPermission(context.grants, "documents.history.view", context.isSuperAdministrator);
  const canViewReturns = hasPermission(context.grants, "returns.view", context.isSuperAdministrator);
  const canViewTransport = hasPermission(context.grants, "transport.view", context.isSuperAdministrator);
  const navigationProps = { canViewRfqs, canViewMarketing, canViewDocuments, canViewReturns, canViewTransport, canManageUsers, isSuperAdministrator: context.isSuperAdministrator };

  return <div className="min-h-screen bg-[#eef1f4]">
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-300 bg-white px-4 shadow-sm lg:px-6">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4"><BrandLogo className="w-28 sm:w-32"/><span className="hidden border-l border-slate-300 pl-4 text-sm font-semibold text-slate-700 min-[420px]:block">Business Suite</span></div>
      <div className="flex items-center gap-3 text-xs text-slate-600 sm:gap-4"><span className="hidden sm:block"><strong className="text-slate-900">Production</strong> · ZAR</span><span className="hidden max-w-52 truncate md:block">{user.email}</span><form action={logoutAction}><button className="font-semibold text-sky-700">Sign out</button></form></div>
    </header>
    <AdminWorkspace
      mobileNavigation={<details className="group/mobile border-b border-slate-800 bg-[#172b3a] text-slate-200 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden"><span>Admin menu</span><span className="text-xs text-slate-400 group-open/mobile:hidden">Open</span><span className="hidden text-xs text-slate-400 group-open/mobile:inline">Close</span></summary>
        <div className="max-h-[calc(100vh-7rem)] overflow-y-auto border-t border-white/10"><AdminNav {...navigationProps} /></div>
      </details>}
      desktopNavigation={<aside className="hidden border-r border-slate-800 bg-[#172b3a] text-slate-200 lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-3.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#172b3a] px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Administration</p><p className="mt-1 text-sm font-semibold text-white">Business Suite</p></div>
        <AdminNav {...navigationProps} />
      </aside>}
    >
      {children}
    </AdminWorkspace>
  </div>;
}
