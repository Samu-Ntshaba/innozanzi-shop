import Link from "next/link";
import { ArrowRight,Gamepad2,Wrench } from "lucide-react";
import type { ProductCardData } from "@/domain/catalogue/queries";
import { HeroSlider } from "./hero-slider";

const features=[
  {href:"/build-a-pc",eyebrow:"PC Builder",title:"Build your PC",body:"Choose compatible components.",icon:Wrench},
  {href:"/gaming",eyebrow:"Gaming",title:"Shop gaming",body:"PCs, components and accessories.",icon:Gamepad2},
] as const;
const categories=[
  ["Laptops","/shop?search=laptop&availability=in-stock"],
  ["Computers","/shop?category=Computers&availability=in-stock"],
  ["Components","/shop?category=Components&availability=in-stock"],
  ["Gaming","/gaming"],
  ["Accessories","/shop?category=Computer%20peripherals&availability=in-stock"],
  ["More","/categories"],
] as const;

export function HomepageFeatureGrid({products}:{products:ProductCardData[]}){
  return <section className="border-b border-slate-200 bg-[#f7f9fb]">
    <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-5 lg:grid lg:min-h-[34rem] lg:grid-cols-[minmax(0,3.3fr)_minmax(260px,1fr)] lg:gap-5 lg:px-8 lg:py-6">
      <div className="hidden lg:block"><HeroSlider products={products} embedded/></div>
      <div className="hidden lg:grid lg:grid-rows-2 lg:gap-5">{features.map(({href,eyebrow,title,body,icon:Icon})=><Link href={href} key={href} className="group rounded-xl border border-slate-200 bg-white p-6 text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg"><Icon className="size-8 text-sky-700"/><p className="mt-4 text-[10px] font-black uppercase tracking-[.18em] text-sky-700">{eyebrow}</p><h2 className="mt-2 text-2xl font-black leading-tight">{title}</h2><p className="mt-2 text-sm leading-5 text-slate-600">{body}</p><span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-sky-700">Open<ArrowRight className="size-3.5 transition group-hover:translate-x-1"/></span></Link>)}</div>
      <nav aria-label="Popular categories" className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:hidden">{categories.map(([label,href])=><Link className="min-h-10 shrink-0 snap-start rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700" href={href} key={label}>{label}</Link>)}</nav>
    </div>
  </section>;
}
