import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { MobileAdminNav } from "@/components/mobile-admin/mobile-nav";
import { logoutAction } from "@/app/(auth)/actions";
import { requireMobileAdmin } from "@/domain/auth/session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mobile Admin",
  manifest: "/mobile-admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Innozanzi Admin", statusBarStyle: "black-translucent" },
};

export default async function MobileAdminLayout({children}:{children:React.ReactNode}) { const {user}=await requireMobileAdmin(); return <div className="min-h-screen bg-slate-100 pb-24"><header className="sticky top-0 z-30 border-b border-white/10 bg-[#071b33] text-white shadow"><div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4"><div className="flex items-center gap-3"><BrandLogo href="/mobile-admin" variant="footer" className="w-28" priority/><Link href="/mobile-admin" className="border-l border-white/30 py-1 pl-3 text-xs font-bold">Mobile Admin</Link></div><form action={logoutAction}><button className="min-h-11 px-2 text-xs font-semibold text-sky-100">Sign out</button></form></div></header><main className="mx-auto max-w-2xl p-4 sm:p-6"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-sky-700">Daily operations</p><p className="mt-1 truncate text-sm text-slate-500">{user.name??user.email}</p></div>{children}</main><MobileAdminNav/></div> }
