import Image from "next/image";
import Link from "next/link";
import { supplierBrandAssets } from "@/config/supplier-marketing";

function BrandRail({duplicate=false}:{duplicate?:boolean}){
  return <div aria-hidden={duplicate||undefined} className="flex shrink-0 gap-3 pr-3">{supplierBrandAssets.map(partner=><Link aria-label={duplicate?undefined:`Browse ${partner.name} products`} className="flex h-24 w-40 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-4 transition-colors hover:border-sky-400 focus-visible:border-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200" href={`/shop?brand=${encodeURIComponent(partner.slug)}`} key={partner.name} tabIndex={duplicate?-1:undefined}><Image alt={duplicate?"":`${partner.name} logo`} className="h-14 w-full object-contain" height={88} src={partner.logo} width={160}/></Link>)}</div>;
}

export function BrandPartners(){
  return <section aria-labelledby="brand-partners-title" className="border-y border-slate-200 bg-white">
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold text-slate-950 sm:text-2xl" id="brand-partners-title">Brands we work with</h2><Link className="shrink-0 text-sm font-semibold text-sky-800 hover:underline" href="/shop">View all products</Link></div>
      <div className="brand-marquee mt-4 overflow-hidden" role="region" aria-label="Supplier brands"><div className="brand-marquee-track flex w-max"><BrandRail/><BrandRail duplicate/></div></div>
    </div>
  </section>;
}
