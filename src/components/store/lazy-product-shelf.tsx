"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductCardData } from "@/domain/catalogue/queries";
import { ProductSection } from "./product-section";

export function LazyProductShelf({shelf,index}:{shelf:{key:string;eyebrow:string;title:string;href:string};index:number}) {
  const anchor=useRef<HTMLDivElement>(null),[products,setProducts]=useState<ProductCardData[]|null>(null),[failed,setFailed]=useState(false);
  useEffect(()=>{const element=anchor.current;if(!element||products||failed)return;const observer=new IntersectionObserver(entries=>{if(!entries[0]?.isIntersecting)return;observer.disconnect();fetch(`/api/catalogue/homepage-shelf/${shelf.key}`).then(response=>{if(!response.ok)throw new Error("Shelf unavailable");return response.json()}).then(data=>setProducts(data.products??[])).catch(()=>setFailed(true));},{rootMargin:"600px 0px"});observer.observe(element);return()=>observer.disconnect()},[failed,products,shelf.key]);
  return <div ref={anchor} className={index%2===0?"bg-white":"bg-slate-50/70"}>{products?<ProductSection eyebrow={shelf.eyebrow} title={shelf.title} products={products} href={shelf.href}/>:failed?null:<section aria-label={`Loading ${shelf.title}`} className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12 lg:px-8"><div className="h-4 w-36 animate-pulse rounded bg-slate-200"/><div className="mt-2 h-8 w-64 animate-pulse rounded bg-slate-200"/><div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">{[0,1,2,3].map(item=><div key={item} className="aspect-[3/4] animate-pulse rounded-lg bg-slate-200/70"/>)}</div></section>}</div>;
}
