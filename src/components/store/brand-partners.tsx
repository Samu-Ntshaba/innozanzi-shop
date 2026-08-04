import Image from "next/image";
import Link from "next/link";

const partners=[
  {name:"WINX",logo:"/marketing/brands/winx.png",dark:true},
  {name:"Intel",logo:"/marketing/brands/intel.png",dark:false},
  {name:"Redragon",logo:"/marketing/brands/redragon.png",dark:false},
  {name:"Giada",logo:"/marketing/brands/giada.png",dark:false},
  {name:"ASRock",logo:"/marketing/brands/asrock.png",dark:false},
  {name:"Antec",logo:"/marketing/brands/antec.png",dark:false},
  {name:"FSP",logo:"/marketing/brands/fsp.png",dark:false},
] as const;

export function BrandPartners(){
  return <section aria-labelledby="brand-partners-title" className="border-y border-slate-200 bg-white">
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold text-slate-950 sm:text-2xl" id="brand-partners-title">Brands we work with</h2><Link className="shrink-0 text-sm font-semibold text-sky-800 hover:underline" href="/shop">View all products</Link></div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{partners.map(partner=><Link aria-label={`Browse ${partner.name} products`} className={`group flex min-h-24 items-center justify-center rounded-xl border p-3 transition hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md ${partner.dark?"border-[#071b33] bg-[#071b33]":"border-slate-200 bg-white"}`} href={`/shop?brand=${encodeURIComponent(partner.name)}`} key={partner.name}><Image alt={`${partner.name} logo`} className="h-16 w-full object-contain opacity-100" height={96} src={partner.logo} width={160}/></Link>)}</div>
    </div>
  </section>;
}
