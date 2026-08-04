"use client";

import { ArrowLeft, ArrowRight, Check, PackageSearch } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductCardData } from "@/domain/catalogue/queries";
import { cn } from "@/lib/utils";

const merchandising = [
  { eyebrow:"Business computers & workstations", headline:"Serious computing for serious workloads.", description:"High-performance notebooks and workstations for engineering, creative, finance and operational teams." },
  { eyebrow:"Professional displays", headline:"See every detail. Work without compromise.", description:"Professional-grade displays selected for productive offices, studios and specialist workspaces." },
  { eyebrow:"Business infrastructure", headline:"Build the backbone your team can rely on.", description:"Storage, networking and continuity hardware for secure, always-on business operations." },
] as const;

export function HeroSlider({products}:{products:ProductCardData[]}) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if(products.length<2||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const timer=window.setInterval(()=>setActive(current=>(current+1)%products.length),7000);
    return()=>window.clearInterval(timer);
  },[products.length]);
  if(!products.length)return null;
  const show=(index:number)=>setActive((index+products.length)%products.length);
  return <section aria-roledescription="carousel" aria-label="Featured business technology" className="border-b border-slate-200 bg-[#f2f6fa]">
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="relative min-h-[32rem] overflow-hidden rounded-2xl border border-slate-800 bg-[#06182e] shadow-xl shadow-slate-900/10 sm:min-h-[30rem]">
        {products.map((product,index)=>{const copy=merchandising[index]??merchandising[2];const href=`/supplier-products/${product.slug}`;return <article aria-hidden={active!==index} className={cn("absolute inset-0 grid transition-opacity duration-500 lg:grid-cols-[1.02fr_.98fr]",active===index?"z-10 opacity-100":"pointer-events-none opacity-0")} key={product.id}>
          <div className="relative flex flex-col justify-center px-6 pb-24 pt-9 text-white sm:px-10 lg:px-14 lg:pb-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,.18),transparent_36%)]"/>
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-sky-300">{copy.eyebrow}</p>
              <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">{copy.headline}</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">{copy.description}</p>
              <div className="mt-6 flex items-center gap-2 text-sm text-emerald-300"><Check className="size-4"/>In stock and ready to quote</div>
              <div className="mt-7 flex flex-wrap gap-3"><Link className="inline-flex min-h-12 items-center rounded-lg bg-white px-5 font-semibold text-[#071b33] hover:bg-sky-50" href={href}>View featured product<ArrowRight className="ml-2 size-4"/></Link><Link className="inline-flex min-h-12 items-center rounded-lg border border-white/30 px-5 font-semibold text-white hover:bg-white/10" href="/shop">Browse catalogue</Link></div>
            </div>
          </div>
          <Link href={href} className="relative mx-4 mb-4 min-h-64 overflow-hidden rounded-xl border-[7px] border-slate-800 bg-gradient-to-br from-white to-slate-100 shadow-2xl sm:mx-6 sm:mb-6 sm:border-[9px] lg:m-5 lg:ml-0">
            <span aria-hidden="true" className="absolute left-1/2 top-1 z-10 size-1.5 -translate-x-1/2 rounded-full bg-slate-500 ring-1 ring-slate-950"/>
            <div className="absolute inset-0 bottom-28 sm:bottom-32">
              {product.images[0]?<Image src={product.images[0].path} alt={product.name} fill priority={index===0} sizes="(max-width: 1023px) 100vw, 48vw" className="object-contain p-2 sm:p-4"/>:<div className="grid h-full place-items-center"><PackageSearch className="size-16 text-slate-300"/></div>}
            </div>
            <div className="absolute inset-x-4 bottom-4 rounded-lg border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:inset-x-6 sm:bottom-6"><p className="text-xs font-bold uppercase tracking-wide text-sky-800">{product.brand?.name??product.category.name}</p><h2 className="mt-1 line-clamp-2 text-base font-semibold text-slate-950 sm:text-lg">{product.name}</h2><p className="mt-1 text-xs text-slate-500">SKU: {product.sku} · Pricing by quotation</p></div>
          </Link>
        </article>})}
        {products.length>1?<div className="absolute bottom-6 left-6 z-20 flex items-center gap-3 sm:left-10 lg:left-14"><button aria-label="Previous featured product" className="grid size-10 place-items-center rounded-full border border-white/30 bg-[#071b33]/70 text-white hover:bg-white hover:text-[#071b33]" onClick={()=>show(active-1)}><ArrowLeft className="size-4"/></button><div className="flex gap-2">{products.map((product,index)=><button aria-label={`Show ${product.name}`} aria-current={active===index} className={cn("h-2 rounded-full transition-all",active===index?"w-8 bg-sky-400":"w-2 bg-white/50")} key={product.id} onClick={()=>show(index)}/>)}</div><button aria-label="Next featured product" className="grid size-10 place-items-center rounded-full border border-white/30 bg-[#071b33]/70 text-white hover:bg-white hover:text-[#071b33]" onClick={()=>show(active+1)}><ArrowRight className="size-4"/></button></div>:null}
      </div>
    </div>
  </section>;
}
