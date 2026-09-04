import Link from "next/link";
import { AccountNav } from "@/components/account/account-nav";
import { logoutAction } from "@/app/(auth)/actions";
import { requireUser } from "@/domain/auth/session";
import { StoreHeader } from "@/components/store/header";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const context = await requireUser();
  const showAdmin = context.isSuperAdministrator || context.grants.some(({ effect }) => effect === "ALLOW");
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <StoreHeader />
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-28 lg:h-[calc(100vh-7rem)] lg:border-b-0 lg:border-r">
          <div className="hidden px-5 pb-2 pt-6 lg:block"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-sky-700">My account</p><p className="mt-1 truncate text-sm font-semibold">{context.user.name ?? context.user.email}</p></div>
          <AccountNav showAdmin={showAdmin} />
          <form action={logoutAction} className="px-4"><button className="min-h-10 text-sm font-semibold text-slate-600 hover:text-sky-800">Sign out</button></form>
          <div className="m-4 hidden rounded-xl bg-[#071b33] p-4 text-white lg:block"><p className="text-xs font-bold text-sky-300">Need help?</p><p className="mt-1 text-xs leading-5 text-slate-300">Our support team can help with products, quotations and delivery.</p><Link className="mt-3 inline-block text-xs font-bold text-white underline" href="/contact">Contact support</Link></div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
