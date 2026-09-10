"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type Suggestion = { id: string; name: string; href: string; image: string; brand: string | null; category: string; sku: string };

export function PredictiveSearch({ autoFocus = false, mobile = false }: { autoFocus?: boolean; mobile?: boolean }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => { if (autoFocus) input.current?.focus(); }, [autoFocus]);
  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/catalogue/suggestions?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        const data = response.ok ? await response.json() as { suggestions?: Suggestion[] } : {};
        setSuggestions(data.suggestions ?? []);
        setOpen(true);
        setActive(-1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 160);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  const optionCount = suggestions.length + (query.trim().length >= 2 ? 1 : 0);
  const move = (direction: number) => setActive(current => optionCount ? (current + direction + optionCount) % optionCount : -1);
  const submitActive = () => {
    if (active >= 0 && active < suggestions.length) window.location.assign(suggestions[active].href);
    else if (active === suggestions.length && query.trim()) window.location.assign(`/shop?search=${encodeURIComponent(query.trim())}&availability=in-stock`);
  };

  return <div ref={root} className="relative w-full">
    <form action="/shop" role="search" className="w-full" onSubmit={event => { if (active >= 0) { event.preventDefault(); submitActive(); } }}>
      <input name="availability" type="hidden" value="in-stock"/>
      <label className={`flex w-full items-center overflow-hidden rounded-md border bg-white focus-within:border-sky-700 focus-within:ring-1 focus-within:ring-sky-700 ${mobile ? "border-sky-700" : "border-slate-300"}`}>
        <input ref={input} className="h-11 min-w-0 flex-1 px-3 text-base outline-none sm:px-4 sm:text-sm" name="search" type="search" role="combobox" enterKeyHint="search" autoComplete="off" aria-label="Search products" aria-autocomplete="list" aria-controls={listId} aria-expanded={open && optionCount > 0} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} placeholder="Search products, brands or SKUs" value={query} onFocus={() => { if (query.trim().length >= 2) setOpen(true); }} onChange={event => { const value = event.target.value; setQuery(value); setOpen(true); setActive(-1); if (value.trim().length < 2) { setSuggestions([]); setBusy(false); } else setBusy(true); }} onKeyDown={event => {
          if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); move(1); }
          else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); move(-1); }
          else if (event.key === "Enter" && active >= 0) { event.preventDefault(); submitActive(); }
          else if (event.key === "Escape") { setOpen(false); setActive(-1); }
        }}/>
        <button aria-label="Search products" className={`grid size-11 shrink-0 place-items-center ${mobile ? "bg-sky-700 text-white" : "text-slate-700 hover:bg-slate-50"}`} type="submit"><Search className="size-5"/></button>
      </label>
    </form>
    {open && query.trim().length >= 2 ? <div id={listId} role="listbox" aria-label="Product suggestions" className="absolute inset-x-0 top-full z-50 mt-1 max-h-[min(28rem,70vh)] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
      {busy && !suggestions.length ? <p className="px-4 py-3 text-sm text-slate-500">Finding products…</p> : null}
      {suggestions.map((item, index) => <Link id={`${listId}-${index}`} role="option" aria-selected={active === index} href={item.href} onPointerMove={() => setActive(index)} className={`grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 px-3 py-2.5 ${active === index ? "bg-sky-50" : "hover:bg-slate-50"}`} key={item.id}>
        <span className="relative size-12 overflow-hidden rounded-md border border-slate-100 bg-white"><Image src={item.image} alt="" fill sizes="48px" className="object-contain p-1"/></span>
        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-950">{item.name}</span><span className="block truncate text-xs text-slate-500">{[item.brand, item.category, item.sku].filter(Boolean).join(" · ")}</span></span>
      </Link>)}
      {!busy && !suggestions.length ? <p className="px-4 py-3 text-sm text-slate-500">No exact suggestion yet.</p> : null}
      <Link id={`${listId}-${suggestions.length}`} role="option" aria-selected={active === suggestions.length} href={`/shop?search=${encodeURIComponent(query.trim())}&availability=in-stock`} onPointerMove={() => setActive(suggestions.length)} className={`flex min-h-11 items-center gap-2 border-t border-slate-100 px-4 text-sm font-bold text-sky-800 ${active === suggestions.length ? "bg-sky-50" : "hover:bg-sky-50"}`}><Search className="size-4"/>See all results for “{query.trim()}”</Link>
    </div> : null}
  </div>;
}
