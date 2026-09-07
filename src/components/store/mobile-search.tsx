"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function MobileSearch() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
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
    {open ? <form id="mobile-product-search" role="search" action="/shop" className="absolute inset-x-0 top-full border-b border-slate-200 bg-white p-3 shadow-sm">
      <div className="mx-auto flex max-w-3xl overflow-hidden rounded-md border border-sky-700 focus-within:ring-1 focus-within:ring-sky-700">
        <input ref={input} aria-label="Search products" name="search" type="search" placeholder="Search products" autoComplete="off" enterKeyHint="search" className="h-11 min-w-0 flex-1 px-3 text-base outline-none"/>
        <button type="submit" aria-label="Submit search" className="grid size-11 shrink-0 place-items-center bg-sky-700 text-white"><Search className="size-5"/></button>
      </div>
    </form> : null}
  </div>;
}
