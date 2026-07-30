import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { logoutAction } from "@/app/(auth)/actions";
import { requireClientPortal } from "@/domain/client-portal/session";

export default async function PortalLayout({children}:{children:React.ReactNode}){
  const{portal}=await requireClientPortal();
  const links=[["Overview","/portal"],["Products","/shop"],["Quotations","/account/quotations"],["Orders","/account/orders"],["Returns","/account/returns"],["Support","/account/support"]].filter(([label])=>label==="Overview"||portal.modules.includes(label.toUpperCase()));
  return <div className="min-h-screen bg-slate-100 text-slate-950"><header className="border-b bg-[#071b33] text-white"><div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6"><Link href="/portal"><BrandLogo className="w-36"/></Link><form action={logoutAction}><button className="border border-white/30 px-3 py-2 text-sm font-semibold">Sign out</button></form></div></header><div className="mx-auto grid max-w-[1440px] lg:grid-cols-[250px_1fr]"><aside className="border-r bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Client Portal</p><p className="mt-1 font-semibold">{portal.customerProfile.company?.companyName??portal.primaryUserId}</p><nav className="mt-6 grid gap-1">{links.map(([label,href])=><Link className="border-l-2 border-transparent px-3 py-2 text-sm font-semibold text-slate-700 hover:border-sky-600 hover:bg-sky-50" href={href} key={label}>{label}</Link>)}</nav><Link className="mt-8 block text-xs font-semibold text-slate-500 underline" href="/account">Ordinary account area</Link></aside><main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main></div></div>;
}
