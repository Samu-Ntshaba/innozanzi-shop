"use client";

import { useState } from "react";
import { X } from "lucide-react";

const message="This product is currently shown as a preview while we complete our reseller onboarding and confirm live availability with distribution partners. You may review the product information, but ordering will open only after distributor approval is complete.";

export function DemoProductAction(){
  const[open,setOpen]=useState(false);
  return <>
    <button className="h-12 flex-1 rounded-lg bg-slate-400 px-6 font-semibold text-white" onClick={()=>setOpen(true)} type="button">Add to quotation</button>
    {open?<div aria-labelledby="demo-product-title" aria-modal="true" className="fixed inset-0 z-[110] grid place-items-end bg-slate-950/50 p-3 backdrop-blur-[2px] sm:place-items-center sm:p-6" role="dialog">
      <section className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="h-1.5 bg-amber-400"/>
        <button aria-label="Close notice" className="absolute right-3 top-4 grid size-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100" onClick={()=>setOpen(false)} type="button"><X className="size-5"/></button>
        <div className="p-6 pr-14 sm:p-8 sm:pr-16">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">Innozanzi update</p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950" id="demo-product-title">Products are not live yet</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">{message}</p>
          <button className="mt-6 min-h-11 rounded-lg bg-[#071b33] px-5 text-sm font-bold text-white hover:bg-sky-800" onClick={()=>setOpen(false)} type="button">Continue browsing</button>
        </div>
      </section>
    </div>:null}
  </>;
}
