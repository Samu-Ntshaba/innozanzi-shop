import Link from "next/link";
import { Bell, ExternalLink, Headphones, LogOut, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ClientPortalNav } from "@/components/portal/client-portal-nav";
import { logoutAction } from "@/app/(auth)/actions";
import { requireClientPortal } from "@/domain/client-portal/session";

export default async function PortalLayout({children}:{children:React.ReactNode}){
  const{context,portal}=await requireClientPortal();
  const organisation=portal.customerProfile.company?.companyName??context.user.name??"Client organisation";
  return <div className="min-h-screen bg-[#eef6f8] text-slate-950">
    <header className="sticky top-0 z-40 border-b border-cyan-400/25 bg-gradient-to-r from-[#062c3c] via-[#06475a] to-[#087b83] text-white shadow-sm">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4"><BrandLogo variant="footer" className="w-32 sm:w-36" priority/><span className="hidden h-7 border-l border-white/25 sm:block"/><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.2em] text-cyan-200">Client Portal</p><p className="truncate text-sm font-semibold text-white">{organisation}</p></div></div>
        <div className="flex items-center gap-2"><span className="hidden rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold text-emerald-100 md:inline-flex"><ShieldCheck className="mr-1.5 size-3.5"/>Secure client workspace</span><button aria-label="Notifications" className="grid size-9 place-items-center rounded-md border border-white/20 bg-white/5 hover:bg-white/10"><Bell className="size-4"/></button><form action={logoutAction}><button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/20 px-3 text-xs font-semibold hover:bg-white/10"><LogOut className="size-4"/><span className="hidden sm:inline">Sign out</span></button></form></div>
      </div>
    </header>
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-cyan-950 bg-[#073341] text-white lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:border-r-cyan-900">
        <div className="border-b border-white/10 px-5 py-5"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300">Your workspace</p><span className="rounded bg-cyan-300/10 px-2 py-1 text-[9px] font-bold text-cyan-200">{portal.tier}</span></div><p className="mt-2 truncate text-sm font-semibold">{context.user.name??context.user.email}</p><p className="mt-0.5 truncate text-xs text-slate-400">{context.user.email}</p></div>
        <ClientPortalNav modules={portal.modules}/>
        <div className="m-4 rounded-lg border border-cyan-300/15 bg-cyan-300/[.06] p-4"><Headphones className="size-5 text-cyan-300"/><p className="mt-3 text-sm font-semibold">Need help?</p><p className="mt-1 text-xs leading-5 text-slate-300">Your Innozanzi support team is available for product, quotation and delivery assistance.</p><Link className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-cyan-300 hover:text-white" href="/account/support">Contact support <ExternalLink className="size-3"/></Link></div>
      </aside>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8 xl:p-10">{children}</main>
    </div>
  </div>;
}
