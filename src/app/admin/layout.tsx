import { BrandLogo } from "@/components/brand-logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { logoutAction } from "@/app/(auth)/actions";
import { requireUser } from "@/domain/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  return <div className="min-h-screen bg-[#eef1f4]">
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-300 bg-white px-4 shadow-sm lg:px-6">
      <div className="flex items-center gap-4"><BrandLogo className="w-32"/><span className="border-l border-slate-300 pl-4 text-sm font-semibold text-slate-700">Business Suite</span></div>
      <div className="flex items-center gap-4 text-xs text-slate-600"><span className="hidden sm:block"><strong className="text-slate-900">Production</strong> · ZAR</span><span className="hidden md:block">{user.email}</span><form action={logoutAction}><button className="font-semibold text-sky-700">Sign out</button></form></div>
    </header>
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="border-r border-slate-800 bg-[#172b3a] text-slate-200 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#172b3a] px-5 py-4"><p className="text-xs uppercase tracking-widest text-slate-400">Sales workspace</p><p className="mt-1 text-sm font-semibold text-white">CRM & Operations</p></div>
        <AdminNav />
      </aside>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  </div>;
}
