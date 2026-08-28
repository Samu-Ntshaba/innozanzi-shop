import Image from "next/image";
import Link from "next/link";
import { supplierBrandAssets } from "@/config/supplier-marketing";

export function BrandPartners(){
  return <section aria-labelledby="brand-partners-title" className="border-y border-slate-200 bg-white">
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold text-slate-950 sm:text-2xl" id="brand-partners-title">Brands we work with</h2><Link className="shrink-0 text-sm font-semibold text-sky-800 hover:underline" href="/shop">View all products</Link></div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{supplierBrandAssets.map(partner=><Link aria-label={`Browse ${partner.name} products`} className="group flex min-h-24 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 transition hover:border-sky-400" href={`/shop?brand=${encodeURIComponent(partner.slug)}`} key={partner.name}><Image alt={`${partner.name} logo`} className="h-14 w-full object-contain" height={88} src={partner.logo} width={160}/></Link>)}</div>
    </div>
  </section>;
}
