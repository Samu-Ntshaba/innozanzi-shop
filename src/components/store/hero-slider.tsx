"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const campaigns=[
  {
    eyebrow:"Current offers",
    headline:"Technology deals, all in one place.",
    description:"Explore current supplier promotions across computers, components, accessories, power and more.",
    action:"View all promotions",
    href:"/shop?collection=promotions&availability=in-stock",
    image:"/marketing/supplier/promotions-campaign-v1.png",
    alt:"A collection of computers, displays and everyday technology representing current promotions",
    imagePosition:"object-center",
  },
  {
    eyebrow:"Unboxed deals",
    headline:"Open-box value. Carefully selected.",
    description:"Browse available unboxed technology from across the supplier catalogue while stock lasts.",
    action:"View all unboxed deals",
    href:"/shop?collection=unboxed&availability=in-stock",
    image:"/marketing/supplier/unboxed-campaign-v1.png",
    alt:"A clean collection of open-box computers and technology products",
    imagePosition:"object-center",
  },
  {
    eyebrow:"Last chance",
    headline:"Final stock. One place to find it.",
    description:"Discover limited supplier stock across technology categories before it leaves the catalogue.",
    action:"View all last-chance products",
    href:"/shop?collection=last-chance&availability=in-stock",
    image:"/marketing/supplier/last-chance-campaign-v1.png",
    alt:"A premium collection of computers, components and technology representing last-chance stock",
    imagePosition:"object-center",
  },
] as const;

export function HeroSlider({embedded=false}:{embedded?:boolean;products?:unknown}){
  const[active,setActive]=useState(0);
  useEffect(()=>{
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const timer=window.setInterval(()=>setActive(current=>(current+1)%campaigns.length),7500);
    return()=>window.clearInterval(timer);
  },[]);
  const show=(index:number)=>setActive((index+campaigns.length)%campaigns.length);

  return <section aria-roledescription="carousel" aria-label="Current technology offer collections" className={embedded?"h-full":"border-b border-slate-200 bg-[#f7f9fb]"}>
    <div className={embedded?"h-full":"mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8"}>
      <div className="relative min-h-[31rem] overflow-hidden rounded-2xl bg-[#071b33] shadow-sm sm:min-h-[34rem] lg:min-h-[31rem]">
        {campaigns.map((campaign,index)=><article aria-hidden={active!==index} className={cn("absolute inset-0 transition duration-700",active===index?"z-10 translate-x-0 opacity-100":"pointer-events-none translate-x-3 opacity-0")} key={campaign.href}>
          <Image src={campaign.image} alt={campaign.alt} fill priority={index===0} sizes="(max-width: 1023px) 100vw, 75vw" className={cn("object-cover",campaign.imagePosition)}/>
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#06182e] via-[#06182e]/90 via-42% to-[#06182e]/5"/>
          <div className="relative z-10 flex h-full max-w-[48rem] flex-col justify-center px-7 pb-24 pt-10 text-white sm:px-12 lg:px-14">
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-sky-300">{campaign.eyebrow}</p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.04] tracking-tight sm:text-5xl lg:text-[3.45rem]">{campaign.headline}</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-200 sm:text-base sm:leading-7">{campaign.description}</p>
            <Link className="mt-7 inline-flex min-h-12 w-fit items-center gap-2 rounded-lg bg-sky-400 px-5 font-bold text-[#071b33] transition hover:bg-sky-300" href={campaign.href}>{campaign.action}<ArrowRight className="size-4"/></Link>
          </div>
        </article>)}
        <div className="absolute bottom-7 left-7 z-20 flex items-center gap-3 sm:left-12 lg:left-14">
          <button aria-label="Previous offer collection" className="grid size-9 place-items-center rounded-full border border-white/35 bg-[#071b33]/40 text-white backdrop-blur hover:bg-white hover:text-[#071b33]" onClick={()=>show(active-1)}><ArrowLeft className="size-4"/></button>
          <div className="flex gap-2">{campaigns.map((campaign,index)=><button aria-label={`Show ${campaign.eyebrow}`} aria-current={active===index} className={cn("h-1.5 rounded-full transition-all",active===index?"w-8 bg-sky-400":"w-3 bg-white/50")} key={campaign.href} onClick={()=>show(index)}/>)}</div>
          <button aria-label="Next offer collection" className="grid size-9 place-items-center rounded-full border border-white/35 bg-[#071b33]/40 text-white backdrop-blur hover:bg-white hover:text-[#071b33]" onClick={()=>show(active+1)}><ArrowRight className="size-4"/></button>
        </div>
      </div>
    </div>
  </section>;
}
