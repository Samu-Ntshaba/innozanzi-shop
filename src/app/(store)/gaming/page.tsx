import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { getGamingCatalogue } from "@/domain/catalogue/queries";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Gaming PCs, Components & Gear",description:"Shop gaming PCs, laptops, graphics cards, monitors, peripherals and streaming gear with live South African availability.",alternates:{canonical:"/gaming"}};
const href=(params:Record<string,string|undefined>)=>{const query=new URLSearchParams(Object.entries(params).filter((entry):entry is [string,string]=>Boolean(entry[1]))).toString();return query?`/gaming?${query}`:"/gaming"};

export default async function GamingPage({searchParams}:{searchParams:Promise<{search?:string;group?:string;brand?:string;page?:string}>}){
  const query=await searchParams,data=await getGamingCatalogue({...query,page:Number(query.page)||1});
  return <main className="min-h-screen bg-white text-slate-950">
    <header className="border-b border-slate-200"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Gaming</h1><form className="mt-5 flex max-w-2xl overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-sky-700 focus-within:ring-1 focus-within:ring-sky-700" action="/gaming"><Search className="ml-4 mt-3.5 size-5 text-slate-400"/><input name="search" defaultValue={query.search} placeholder="Search gaming products" className="h-12 min-w-0 flex-1 px-3 text-base outline-none"/><button className="m-1 rounded-md bg-sky-700 px-5 text-sm font-bold text-white hover:bg-sky-800">Search</button></form></div></header>
    <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <nav aria-label="Gaming categories" className="flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none]"><Link href={href({search:query.search,brand:query.brand})} className={`min-h-10 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${!query.group?'border-sky-700 bg-sky-700 text-white':'border-slate-300 text-slate-700 hover:border-sky-500'}`}>All <span className="ml-1 opacity-70">{data.total}</span></Link>{data.groups.map(group=><Link href={href({group:group.slug,search:query.search,brand:query.brand})} key={group.slug} className={`min-h-10 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${query.group===group.slug?'border-sky-700 bg-sky-700 text-white':'border-slate-300 text-slate-700 hover:border-sky-500'}`}>{group.name}<span className="ml-2 text-xs opacity-60">{group.count}</span></Link>)}</nav>
      <div className="mt-6 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-xl font-bold">{data.total.toLocaleString("en-ZA")} products</h2><form action="/gaming" className="flex gap-2"><input type="hidden" name="group" value={query.group??""}/><input type="hidden" name="search" value={query.search??""}/><select name="brand" defaultValue={query.brand??""} className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm" aria-label="Brand"><option value="">All brands</option>{data.brands.map(brand=><option key={brand}>{brand}</option>)}</select><button className="rounded-md border border-slate-300 px-4 text-sm font-semibold hover:border-sky-500">Apply</button></form></div>
      {data.products.length?<div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">{data.products.map(product=><ProductCard product={product} key={product.id}/>)}</div>:<div className="py-20 text-center"><h2 className="font-bold">No matching products</h2><p className="mt-1 text-sm text-slate-500">Try another category, brand or search.</p></div>}
      {data.pages>1?<nav className="mt-10 flex flex-wrap justify-center gap-2" aria-label="Gaming catalogue pages">{Array.from({length:data.pages},(_,index)=>index+1).slice(Math.max(0,data.page-3),data.page+2).map(page=><Link className={`grid size-10 place-items-center rounded-md border text-sm font-bold ${page===data.page?'border-sky-700 bg-sky-700 text-white':'border-slate-300 text-slate-700'}`} href={href({...query,page:String(page)})} key={page}>{page}</Link>)}</nav>:null}
    </section>
  </main>;
}
