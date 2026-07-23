"use client";

import { Headphones, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "27712384185").replace(/\D/g, "");

export function SupportLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const message = `Hello Innozanzi, I need help with business technology. I am viewing ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.innozanzi.co.za"}${pathname}.`;
  const whatsapp = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="group fixed bottom-5 right-4 z-50 flex flex-col items-end gap-2 sm:right-6">
      <div className={`${open ? "visible translate-y-0 opacity-100" : "invisible translate-y-2 opacity-0"} space-y-2 transition sm:group-focus-within:visible sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100 sm:group-hover:visible sm:group-hover:translate-y-0 sm:group-hover:opacity-100`}>
        <a className="flex min-h-11 items-center gap-2 rounded-full bg-[#1f9d55] px-4 text-sm font-bold text-white shadow-xl hover:bg-[#178447]" href={whatsapp} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
          <MessageCircle className="size-5" /> Continue on WhatsApp
        </a>
        <Link className="flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-slate-800 shadow-xl ring-1 ring-slate-200 hover:text-sky-700" href="/contact" onClick={() => setOpen(false)}>
          <Headphones className="size-5" /> Email our help desk
        </Link>
      </div>
      <button aria-label={open ? "Close support options" : "Open support options"} aria-expanded={open} onClick={() => setOpen((value) => !value)} type="button" className="flex min-h-14 items-center gap-3 rounded-full bg-[#071b33] px-4 text-sm font-bold text-white shadow-2xl ring-4 ring-white/90 hover:bg-sky-800">
        <span className="grid size-8 place-items-center rounded-full bg-[#25d366]"><MessageCircle className="size-5" /></span>
        <span>Talk to our team</span>
      </button>
    </div>
  );
}
