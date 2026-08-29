"use client";

import { Headphones, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { brand } from "@/config/brand";

const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "27712384185").replace(/\D/g, "");

export function SupportLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [eligiblePath, setEligiblePath] = useState<string|null>(null);
  const message = `Hello ${brand.name}, I need help with a product. I am viewing ${brand.siteUrl}${pathname}.`;
  const whatsapp = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  useEffect(() => {
    if(sessionStorage.getItem("innozanzi-support-dismissed")==="1")return;
    let interactions=0,seconds=0;
    const activity=()=>{interactions+=1},check=()=>{seconds+=5;const root=document.documentElement,scrollable=Math.max(1,root.scrollHeight-window.innerHeight),progress=window.scrollY/scrollable;if((seconds>=35&&progress>=.7)||(seconds>=90&&interactions>=8)){setOpen(false);setEligiblePath(pathname)}};
    const timer=window.setInterval(check,5_000);window.addEventListener("pointerdown",activity,{passive:true});window.addEventListener("keydown",activity);window.addEventListener("scroll",activity,{passive:true});
    return()=>{window.clearInterval(timer);window.removeEventListener("pointerdown",activity);window.removeEventListener("keydown",activity);window.removeEventListener("scroll",activity)};
  },[pathname]);

  if(eligiblePath!==pathname||["/cart","/checkout","/sign-in","/register"].some(path=>pathname.startsWith(path)))return null;

  return (
    <div className="group fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2 sm:right-6 lg:bottom-5">
      <div className={`${open ? "visible translate-y-0 opacity-100" : "invisible translate-y-2 opacity-0"} space-y-2 transition sm:group-focus-within:visible sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100 sm:group-hover:visible sm:group-hover:translate-y-0 sm:group-hover:opacity-100`}>
        <a className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-md hover:border-slate-400" href={whatsapp} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
          <MessageCircle className="size-5" /> Continue on WhatsApp
        </a>
        <Link className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-md hover:border-slate-400" href="/contact" onClick={() => setOpen(false)}>
          <Headphones className="size-5" /> Email our help desk
        </Link>
      </div>
      <button aria-label={open ? "Close support options" : "Open support options"} aria-expanded={open} onClick={() => {if(open){sessionStorage.setItem("innozanzi-support-dismissed","1");setEligiblePath(null)}else setOpen(true)}} type="button" className="flex min-h-12 items-center gap-2 rounded-md bg-[#071b33] px-4 text-sm font-semibold text-white shadow-lg hover:bg-slate-800">
        <MessageCircle className="size-5 text-sky-300" />
        <span>Talk to our team</span>
      </button>
    </div>
  );
}
