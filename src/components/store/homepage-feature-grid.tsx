import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import type { ProductCardData } from "@/domain/catalogue/queries";
import { formatZar } from "@/lib/money";
import { HeroSlider } from "./hero-slider";
import { ProductCard } from "./product-card";

function productHref(product: ProductCardData) {
  return product.source === "supplier" ? `/supplier-products/${product.slug}` : `/products/${product.slug}`;
}

function productPrice(product: ProductCardData) {
  return product.salePrice?.toString() ?? product.regularPrice?.toString() ?? null;
}

function productStory(product: ProductCardData) {
  const text = `${product.name} ${product.category.name}`.toLowerCase();
  if (/monitor|display/.test(text)) return "Display brilliance";
  if (/creator|workstation/.test(text)) return "Creator power";
  if (/gaming|rog|rtx/.test(text)) return "Serious performance";
  return "Premium technology";
}

function SupportingSpotlight({ product }: { product: ProductCardData }) {
  const image = product.images[0], price = productPrice(product);
  return <Link href={productHref(product)} className="group grid min-h-56 grid-cols-[minmax(0,1fr)_42%] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-xl lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_44%]">
    <div className="flex min-w-0 flex-col p-5 sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-700">{productStory(product)}</p>
      <h2 className="mt-2 line-clamp-3 text-lg font-black leading-tight tracking-tight text-slate-950 sm:text-xl">{product.name}</h2>
      <div className="mt-auto pt-4"><p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700"><Check className="size-3.5"/>Available now</p>{price ? <p className="mt-1 text-lg font-black text-slate-950">{formatZar(price)}</p> : null}<span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-sky-800">Explore product <ArrowRight className="size-3.5 transition group-hover:translate-x-1"/></span></div>
    </div>
    <div className="relative m-2 ml-0 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-sky-100/70">{image ? <Image src={image.path} alt={image.altText ?? product.name} fill sizes="190px" className="object-contain p-3 transition duration-500 group-hover:scale-105"/> : null}</div>
  </Link>;
}

export function HomepageFeatureGrid({ products }: { products: ProductCardData[] }) {
  const [lead, ...supporting] = products;
  if (!lead) return <HeroSlider/>;
  const leadImage = lead.images[0], leadPrice = productPrice(lead);

  return <section className="border-b border-slate-200 bg-[#f3f7fb]">
    <h1 className="sr-only">Shop computers, laptops, gaming and professional technology at Innozanzi</h1>

    <div className="px-4 pb-4 pt-3 lg:hidden">
      <div className="mb-3 flex items-center justify-between gap-3"><p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.17em] text-sky-700"><Sparkles className="size-3.5"/>This week&apos;s standout tech</p><Link className="shrink-0 text-xs font-bold text-sky-800" href="/shop?availability=in-stock">Shop all</Link></div>
      <div aria-label="This week's featured products" className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">{products.map(product => <div className="w-[46vw] min-w-40 max-w-56 shrink-0 snap-start" key={product.id}><ProductCard product={product}/></div>)}</div>
    </div>

    <div className="mx-auto hidden max-w-7xl px-8 py-9 lg:block">
      <div className="mb-5 flex items-center justify-between"><p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.22em] text-sky-700"><Sparkles className="size-4"/>The Innozanzi edit · refreshed weekly</p><Link className="inline-flex items-center gap-1 text-sm font-bold text-sky-800 hover:underline" href="/shop?availability=in-stock">Shop all technology <ArrowRight className="size-4"/></Link></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(310px,.9fr)]">
        <Link href={productHref(lead)} className="group relative grid min-h-[31rem] grid-cols-[minmax(0,.88fr)_minmax(0,1.12fr)] overflow-hidden rounded-[2rem] bg-[#06182e] text-white shadow-xl shadow-slate-950/10">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgba(14,165,233,.28),transparent_38%),linear-gradient(135deg,#06182e_0%,#0a2748_58%,#075985_100%)]"/>
          <div className="relative z-10 flex flex-col p-10">
            <div className="flex flex-wrap gap-2"><span className="rounded-full bg-sky-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-[#06182e]">This week&apos;s flagship</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-sky-100">In stock now</span></div>
            <p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-sky-300">{lead.brand?.name ?? lead.category.name}</p>
            <h2 className="mt-3 text-[2rem] font-black leading-[1.08] tracking-tight">{lead.name}</h2>
            <div className="mt-auto pt-7">{leadPrice ? <><p className="text-xs text-sky-100">Available from</p><p className="mt-1 text-3xl font-black tracking-tight">{formatZar(leadPrice)}</p></> : null}<span className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#06182e] transition group-hover:bg-sky-300">View product <ArrowRight className="size-4 transition group-hover:translate-x-1"/></span></div>
          </div>
          <div className="relative overflow-hidden"><div aria-hidden="true" className="absolute inset-7 left-2 rounded-[2rem] bg-white/95 shadow-2xl shadow-sky-950/30"/>{leadImage ? <Image src={leadImage.path} alt={leadImage.altText ?? lead.name} fill priority sizes="660px" className="object-contain p-14 transition duration-700 group-hover:scale-[1.035]"/> : null}</div>
        </Link>
        <div className="grid grid-rows-2 gap-5">{supporting.slice(0, 2).map(product => <SupportingSpotlight key={product.id} product={product}/>)}</div>
      </div>
    </div>
  </section>;
}
