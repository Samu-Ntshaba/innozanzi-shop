import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { MobileAdminNav } from "@/components/mobile-admin/mobile-nav";
import { logoutAction } from "@/app/(auth)/actions";
import { requireMobileAdmin } from "@/domain/auth/session";

export default async function MobileAdminLayout({children}:{children:React.ReactNode}) { const {user}=await requireMobileAdmin(); return <div className="min-h-screen bg-slate-100 pb-24"><header className="sticky top-0 z-30 border-b border-white/10 bg-[#071b33] text-white shadow"><div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4"><Link href="/mobile-admin" className="flex items-center gap-3"><BrandLogo className="w-28 brightness-0 invert" priority/><span className="border-l border-white/30 pl-3 text-xs font-bold">Mobile Admin</span></Link><form action={logoutAction}><button className="min-h-11 px-2 text-xs font-semibold text-sky-100">Sign out</button></form></div></header><main className="mx-auto max-w-2xl p-4 sm:p-6"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-sky-700">Daily operations</p><p className="mt-1 truncate text-sm text-slate-500">{user.name??user.email}</p></div>{children}</main><MobileAdminNav/></div> }
