"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

export type StorePopup = {
  id:string;
  key:string;
  heading:string;
  body:string;
  buttonLabel:string|null;
  buttonLink:string|null;
  audience:"ALL"|"GUEST"|"AUTHENTICATED";
  pathMode:"ALL"|"INCLUDE"|"EXCLUDE";
  paths:string[];
  frequency:"ONCE_SESSION"|"ONCE_7_DAYS"|"EVERY_VISIT";
  tone:"INFO"|"NOTICE"|"SUCCESS";
};

const matchesPath=(pathname:string,path:string)=>path==="/" ? pathname==="/" : pathname===path||pathname.startsWith(`${path}/`);

export function MarketingPopup({popups,isAuthenticated}:{popups:StorePopup[];isAuthenticated:boolean}){
  const pathname=usePathname();
  const [active,setActive]=useState<StorePopup|null>(null);
  useEffect(()=>{
    const popup=popups.find(item=>{
      if(item.audience==="GUEST"&&isAuthenticated)return false;
      if(item.audience==="AUTHENTICATED"&&!isAuthenticated)return false;
      const pathMatch=item.paths.some(path=>matchesPath(pathname,path));
      if(item.pathMode==="INCLUDE"&&!pathMatch)return false;
      if(item.pathMode==="EXCLUDE"&&pathMatch)return false;
      if(item.frequency==="ONCE_SESSION"&&sessionStorage.getItem(`popup:${item.id}`))return false;
      if(item.frequency==="ONCE_7_DAYS"){
        const dismissed=Number(localStorage.getItem(`popup:${item.id}`)??0);
        if(dismissed>Date.now()-7*24*60*60*1000)return false;
      }
      return true;
    });
    const next=popup??null;
    queueMicrotask(()=>setActive(next));
  },[isAuthenticated,pathname,popups]);
  if(!active)return null;
  const close=()=>{
    if(active.frequency==="ONCE_SESSION")sessionStorage.setItem(`popup:${active.id}`,"1");
    if(active.frequency==="ONCE_7_DAYS")localStorage.setItem(`popup:${active.id}`,String(Date.now()));
    setActive(null);
  };
  const accent=active.tone==="SUCCESS"?"bg-emerald-500":active.tone==="NOTICE"?"bg-amber-400":"bg-sky-500";
  return <div aria-labelledby={`popup-title-${active.id}`} aria-modal="true" className="fixed inset-0 z-[100] grid place-items-end bg-slate-950/45 p-3 backdrop-blur-[2px] sm:place-items-center sm:p-6" role="dialog">
    <section className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className={`h-1.5 ${accent}`}/>
      <button aria-label="Close announcement" className="absolute right-3 top-4 grid size-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950" onClick={close} type="button"><X className="size-5"/></button>
      <div className="p-6 pr-14 sm:p-8 sm:pr-16">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">Innozanzi update</p>
        <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950" id={`popup-title-${active.id}`}>{active.heading}</h2>
        <p className="mt-3 text-base leading-7 text-slate-600">{active.body}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <button className="min-h-11 px-5 text-sm font-bold text-slate-600 hover:text-slate-950" onClick={close} type="button">Continue browsing</button>
          {active.buttonLink&&active.buttonLabel?<Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#071b33] px-5 text-sm font-bold text-white hover:bg-sky-800" href={active.buttonLink} onClick={close}>{active.buttonLabel}</Link>:null}
        </div>
      </div>
    </section>
  </div>;
}
