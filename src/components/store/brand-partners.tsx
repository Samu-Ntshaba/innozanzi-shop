import Image from "next/image";
import Link from "next/link";

const partners=[
  {name:"WINX",logo:"/marketing/brands/winx.png"},
  {name:"Intel",logo:"/marketing/brands/intel.png"},
  {name:"Redragon",logo:"/marketing/brands/redragon.png"},
  {name:"Giada",logo:"/marketing/brands/giada.png"},
  {name:"ASRock",logo:"/marketing/brands/asrock.png"},
  {name:"Antec",logo:"/marketing/brands/antec.png"},
  {name:"FSP",logo:"/marketing/brands/fsp.png"},
] as const;

export function BrandPartners(){
  return <section aria-labelledby="brand-partners-title" className="border-y border-slate-200 bg-white">
    <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">Authorised catalogue brands</p><h2 className="mt-2 text-2xl font-semibold text-slate-950" id="brand-partners-title">Technology brands we work with</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Explore business technology sourced through our distribution network, with availability confirmed before quotation.</p></div><Link className="text-sm font-semibold text-sky-800 hover:underline" href="/shop">Browse the full catalogue</Link></div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{partners.map(partner=><Link aria-label={`Browse ${partner.name} products`} className="group flex min-h-28 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white hover:shadow-md" href={`/shop?brand=${encodeURIComponent(partner.name)}`} key={partner.name}><Image alt={`${partner.name} logo`} className="h-16 w-full object-contain grayscale transition group-hover:grayscale-0" height={96} src={partner.logo} width={160}/></Link>)}</div>
    </div>
  </section>;
}
