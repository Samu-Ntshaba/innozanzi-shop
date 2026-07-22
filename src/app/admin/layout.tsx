import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { logoutAction } from "@/app/(auth)/actions";
import { requireUser } from "@/domain/auth/session";

const links = [["Dashboard", "/admin"], ["Products", "/admin/products"], ["Categories", "/admin/categories"], ["Brands", "/admin/brands"], ["Suppliers", "/admin/suppliers"], ["Inventory", "/admin/inventory"], ["Orders", "/admin/orders"], ["Payments", "/admin/payments"], ["Customers", "/admin/customers"], ["Reviews", "/admin/reviews"]] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  return <div className="min-h-screen bg-slate-100"><header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><BrandLogo className="w-32 sm:w-36" /><span className="hidden text-sm font-semibold text-slate-500 sm:block">Administration</span></div><div className="flex items-center gap-3 text-sm"><span className="hidden sm:block">{user.email}</span><form action={logoutAction}><button className="text-sky-800 underline" type="submit">Sign out</button></form></div></div></header><div className="mx-auto grid max-w-7xl gap-6 p-4 md:grid-cols-[210px_minmax(0,1fr)] md:p-6"><nav aria-label="Administration" className="h-fit rounded-xl bg-[#071b33] p-4 text-slate-200 shadow-sm"><ul className="grid grid-cols-2 gap-2 text-sm md:grid-cols-1">{links.map(([label, href]) => <li key={href}><Link className="block rounded-lg px-3 py-2 hover:bg-white/10" href={href}>{label}</Link></li>)}</ul></nav><main>{children}</main></div></div>;
}
