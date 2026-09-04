"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export function MobileMenu({categories,signedIn}:{categories:string[];signedIn:boolean}) {
  const [open,setOpen]=useState(false);
  const mounted=useSyncExternalStore(()=>()=>{},()=>true,()=>false);
  const closeButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    closeButton.current?.focus();
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};
    window.addEventListener("keydown",escape);
    return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",escape)};
  },[open]);
  const item="block min-h-11 py-2.5 text-sm font-medium text-slate-700 hover:text-sky-800 focus-visible:outline-2 focus-visible:outline-sky-700";
  const drawer=mounted?createPortal(<div aria-hidden={!open} className={`fixed inset-0 z-[200] lg:hidden ${open?"pointer-events-auto":"pointer-events-none"}`}>
    <button aria-label="Close menu" tabIndex={open?0:-1} className={`absolute inset-0 h-full w-full bg-slate-950/55 transition-opacity duration-200 ${open?"opacity-100":"opacity-0"}`} onClick={()=>setOpen(false)}/>
    <aside id="mobile-store-menu" role="dialog" aria-modal="true" aria-label="Navigation menu" className={`absolute inset-y-0 left-0 flex w-[min(86vw,20rem)] flex-col overflow-y-auto bg-white shadow-2xl transition-transform duration-200 ease-out ${open?"translate-x-0":"-translate-x-full"}`}>
      <div className="flex min-h-14 items-center justify-between border-b border-slate-200 px-4"><strong className="text-base text-slate-950">Menu</strong><button ref={closeButton} aria-label="Close menu" onClick={()=>setOpen(false)} className="grid size-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100"><X className="size-5"/></button></div>
      <nav className="p-4" onClick={event=>{if((event.target as HTMLElement).closest("a"))setOpen(false)}}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Shop</p>
        <div className="mt-1 divide-y divide-slate-100"><Link className={item} href="/shop">All products</Link>{categories.map(category=><Link className={item} href={`/categories/${encodeURIComponent(category)}`} key={category}>{category}</Link>)}<Link className={item} href="/gaming">Gaming</Link><Link className={item} href="/build-a-pc">Build a PC</Link><Link className={item} href="/categories">More categories</Link></div>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Account</p>
        <div className="mt-1 divide-y divide-slate-100">{signedIn?<><Link className={item} href="/account">My account</Link><Link className={item} href="/account/orders">Orders &amp; tracking</Link></>:<><Link className={item} href="/sign-in">Log in</Link><Link className={item} href="/register">Create account</Link></>}</div>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Help</p>
        <div className="mt-1 divide-y divide-slate-100"><Link className={item} href="/contact">Support</Link><Link className={item} href="/how-to">Shopping &amp; delivery</Link><Link className={item} href="/returns-policy">Returns &amp; refunds</Link></div>
      </nav>
    </aside>
  </div>,document.body):null;
  return <><button aria-expanded={open} aria-controls="mobile-store-menu" aria-label="Open menu" onClick={()=>setOpen(true)} className="grid size-10 shrink-0 place-items-center rounded-md text-slate-700 hover:bg-slate-100 lg:hidden"><Menu className="size-5"/></button>{drawer}</>;
}
