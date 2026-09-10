"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const visible = images.slice(0, 12);
  const move = useCallback((direction: number) => setActive(current => (current + direction + visible.length) % visible.length), [visible.length]);

  useEffect(() => {
    if (!expanded) return;
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "ArrowLeft" && visible.length > 1) move(-1);
      if (event.key === "ArrowRight" && visible.length > 1) move(1);
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, [expanded, move, visible.length]);

  const controls = visible.length > 1 ? <>
    <button type="button" aria-label="Previous product image" onClick={() => move(-1)} className="absolute left-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-800 shadow-sm transition hover:bg-sky-50"><ChevronLeft className="size-5"/></button>
    <button type="button" aria-label="Next product image" onClick={() => move(1)} className="absolute right-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-800 shadow-sm transition hover:bg-sky-50"><ChevronRight className="size-5"/></button>
  </> : null;

  return <div className="min-w-0">
    <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:aspect-square">
      {visible[active] ? <button type="button" aria-label="Open larger product image" onClick={() => setExpanded(true)} className="absolute inset-0 cursor-zoom-in"><Image src={visible[active]} alt={`${name} — image ${active + 1}`} fill sizes="(max-width:1024px) 100vw,50vw" className="object-contain p-5 transition duration-300 group-hover:scale-[1.02] sm:p-9" priority/></button> : <div className="grid h-full place-items-center px-6 text-center text-slate-500">Product image unavailable</div>}
      {controls}
      {visible.length ? <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-slate-950/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"><Expand className="size-3.5"/>{active + 1} / {visible.length}</div> : null}
    </div>
    {visible.length > 1 ? <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Product image thumbnails">{visible.map((image, index) => <button type="button" aria-label={`View image ${index + 1}`} aria-current={active === index} onClick={() => setActive(index)} className={`relative size-16 shrink-0 overflow-hidden rounded-xl border bg-white transition sm:size-20 ${active === index ? "border-sky-700 ring-2 ring-sky-100" : "border-slate-200 hover:border-sky-400"}`} key={image}><Image src={image} alt="" fill sizes="80px" className="object-contain p-2"/></button>)}</div> : <p className="mt-3 text-center text-xs text-slate-500">Select the image to view it larger</p>}
    {expanded && visible[active] ? <div role="dialog" aria-modal="true" aria-label={`${name} image viewer`} className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/90 p-3 backdrop-blur-sm sm:p-8" onClick={() => setExpanded(false)}>
      <button type="button" aria-label="Close image viewer" onClick={() => setExpanded(false)} className="absolute right-4 top-4 z-20 grid size-11 place-items-center rounded-full bg-white text-slate-950 shadow-lg"><X className="size-5"/></button>
      <div className="relative h-full w-full max-w-6xl" onClick={event => event.stopPropagation()}><Image src={visible[active]} alt={`${name} — enlarged image ${active + 1}`} fill sizes="100vw" className="object-contain" priority/>{controls}</div>
    </div> : null}
  </div>;
}
