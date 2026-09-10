"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PredictiveSearch } from "@/components/store/predictive-search";

export function MobileSearch() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return <div ref={container} className="lg:hidden">
    <button ref={trigger} type="button" aria-label={open ? "Close search" : "Search products"} aria-expanded={open} aria-controls="mobile-product-search" onClick={() => setOpen(!open)} className="grid size-10 place-items-center rounded-md text-slate-700 hover:bg-slate-100 sm:size-11">{open ? <X className="size-5"/> : <Search className="size-5"/>}</button>
    {open ? <div id="mobile-product-search" className="absolute inset-x-0 top-full border-b border-slate-200 bg-white p-3 shadow-sm"><div className="mx-auto max-w-3xl"><PredictiveSearch autoFocus mobile/></div></div> : null}
  </div>;
}
