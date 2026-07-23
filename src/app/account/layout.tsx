import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { AccountNav } from "@/components/account/account-nav";
import { logoutAction } from "@/app/(auth)/actions";
import { requireUser } from "@/domain/auth/session";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const context = await requireUser();
  const showAdmin = context.isSuperAdministrator || context.grants.some(({ effect }) => effect === "ALLOW");
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <Link href="/"><BrandLogo className="w-32 sm:w-36" /></Link>
          <div className="flex items-center gap-3 text-sm"><Link className="hidden font-semibold text-slate-600 hover:text-sky-700 sm:block" href="/shop">Browse solutions</Link><form action={logoutAction}><button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold">Sign out</button></form></div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r">
          <div className="hidden px-5 pb-2 pt-6 lg:block"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-sky-700">Client workspace</p><p className="mt-1 truncate text-sm font-semibold">{context.user.name ?? context.user.email}</p></div>
          <AccountNav showAdmin={showAdmin} />
          <div className="m-4 hidden rounded-xl bg-[#071b33] p-4 text-white lg:block"><p className="text-xs font-bold text-sky-300">Need help?</p><p className="mt-1 text-xs leading-5 text-slate-300">Our support team can help with products, quotations and delivery.</p><Link className="mt-3 inline-block text-xs font-bold text-white underline" href="/contact">Contact support</Link></div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
