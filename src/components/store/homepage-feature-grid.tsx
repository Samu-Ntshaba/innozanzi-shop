import Link from "next/link";
import { ArrowRight, Gamepad2, Wrench } from "lucide-react";
import type { ProductCardData } from "@/domain/catalogue/queries";
import { HeroSlider } from "./hero-slider";

const features=[
  {href:"/build-a-pc",eyebrow:"Build your machine",title:"Your PC. Your project.",body:"Choose every component and bring your build to life.",icon:Wrench,className:"from-sky-950 via-[#071b33] to-cyan-950",accent:"text-cyan-300"},
  {href:"/gaming",eyebrow:"Enter gaming",title:"Gear up. Play harder.",body:"Gaming machines, components and gear in one place.",icon:Gamepad2,className:"from-violet-950 via-[#160b32] to-fuchsia-950",accent:"text-violet-300"},
] as const;

export function HomepageFeatureGrid({products}:{products:ProductCardData[]}){
  return <><section className="border-b border-slate-200 bg-[#f7f9fb] lg:hidden"><div className="grid grid-cols-2 gap-3 px-3 py-3">{features.map(({href,title,icon:Icon,className})=><Link href={href} key={href} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${className} p-4 text-white`}><Icon className="size-6 text-sky-300"/><strong className="mt-5 block text-sm leading-5">{title}</strong><span className="mt-2 inline-flex items-center text-xs font-bold text-sky-200">Open<ArrowRight className="ml-1 size-3"/></span></Link>)}</div></section><section className="hidden border-b border-slate-200 bg-[#f7f9fb] lg:block"><div className="mx-auto grid h-[31rem] max-w-7xl grid-cols-[minmax(0,3.25fr)_minmax(260px,1fr)] gap-5 px-8 py-6"><HeroSlider products={products} embedded/><div className="grid min-h-0 grid-rows-2 gap-5">{features.map(({href,eyebrow,title,body,icon:Icon,className,accent})=><Link href={href} key={href} className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${className} p-6 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl`}><div className="absolute -right-12 -top-12 size-40 rounded-full bg-white/10 blur-2xl transition group-hover:scale-125"/><Icon className={`relative size-8 ${accent}`}/><p className={`relative mt-5 text-[10px] font-black uppercase tracking-[.18em] ${accent}`}>{eyebrow}</p><h2 className="relative mt-2 text-2xl font-black leading-tight">{title}</h2><p className="relative mt-2 text-sm leading-5 text-slate-300">{body}</p><span className={`relative mt-4 inline-flex items-center gap-2 text-sm font-black ${accent}`}>Explore<ArrowRight className="size-4 transition group-hover:translate-x-1"/></span></Link>)}</div></div></section></>;
}
