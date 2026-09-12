import Image from "next/image";
import Link from "next/link";
import { supplierBrandAsset } from "@/config/supplier-marketing";
import { sellableSupplierWhere } from "@/integrations/suppliers/availability";
import { prisma } from "@/lib/prisma";

type Partner={name:string;slug:string;logo?:string};
function BrandRail({partners,duplicate=false}:{partners:Partner[];duplicate?:boolean}){
  return <div aria-hidden={duplicate||undefined} className="flex shrink-0 gap-3 pr-3">{partners.map(partner=><Link aria-label={duplicate?undefined:`Browse ${partner.name} products`} className="flex h-24 w-40 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-4 text-center text-lg font-bold text-slate-800 transition-colors hover:border-sky-400 focus-visible:border-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200" href={`/shop?brand=${encodeURIComponent(partner.slug)}`} key={partner.name} tabIndex={duplicate?-1:undefined}>{partner.logo?<Image alt={duplicate?"":`${partner.name} logo`} className="h-14 w-full object-contain" height={88} src={partner.logo} width={160}/>:partner.name}</Link>)}</div>;
}

export async function BrandPartners(){
  let popular:Partner[]=[];
  try{
    const rows=await prisma.supplierCatalogueProduct.groupBy({by:["brand"],where:{active:true,availability:"IN_STOCK",stock:{gt:0},brand:{not:null},...await sellableSupplierWhere()},_count:{brand:true},orderBy:{_count:{brand:"desc"}},take:18});
    popular=rows.flatMap(row=>{if(!row.brand)return[];const asset=supplierBrandAsset(row.brand);return[{name:asset?.name??row.brand,slug:asset?.slug??row.brand,logo:asset?.logo}]});
  }catch{/* Hide the rail when live catalogue availability cannot be confirmed. */}
  const partners=popular.filter((partner,index,array)=>array.findIndex(item=>item.name.toLowerCase()===partner.name.toLowerCase())===index).slice(0,20);
  if(!partners.length)return null;
  return <section aria-labelledby="brand-partners-title" className="border-y border-slate-200 bg-white">
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold text-slate-950 sm:text-2xl" id="brand-partners-title">Brands available in our catalogue</h2><Link className="shrink-0 text-sm font-semibold text-sky-800 hover:underline" href="/shop">View all products</Link></div>
      <div className="brand-marquee mt-4 overflow-hidden" role="region" aria-label="Popular catalogue brands"><div className="brand-marquee-track flex w-max"><BrandRail partners={partners}/><BrandRail partners={partners} duplicate/></div></div>
    </div>
  </section>;
}
