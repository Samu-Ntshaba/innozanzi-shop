import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Cpu, Gamepad2, Laptop, Monitor, Sparkles, Wrench } from "lucide-react";
import type { ProductCardData } from "@/domain/catalogue/queries";
import { formatZar } from "@/lib/money";
import { HeroSlider } from "./hero-slider";

const pathways = [
  { label: "Flagship laptops", detail: "Premium work and play", href: "/shop?search=laptop&availability=in-stock", icon: Laptop },
  { label: "Gaming PCs", detail: "Performance without compromise", href: "/gaming?group=gaming-pcs", icon: Gamepad2 },
  { label: "Creator workstations", detail: "Power for serious ideas", href: "/shop?category=business-computers&availability=in-stock", icon: Cpu },
  { label: "Professional displays", detail: "See every detail", href: "/shop?search=monitor&availability=in-stock", icon: Monitor },
  { label: "Build your own PC", detail: "Compatible from the start", href: "/build-a-pc", icon: Wrench },
] as const;

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
    <div className="relative m-2 ml-0 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-sky-100/70">{image ? <Image src={image.path} alt={image.altText ?? product.name} fill sizes="(max-width: 1023px) 42vw, 190px" className="object-contain p-3 transition duration-500 group-hover:scale-105"/> : null}</div>
  </Link>;
}

export function HomepageFeatureGrid({ products }: { products: ProductCardData[] }) {
  const [lead, ...supporting] = products;
  if (!lead) return <HeroSlider/>;
  const leadImage = lead.images[0], leadPrice = productPrice(lead);

  return <section className="border-b border-slate-200 bg-[#f3f7fb]">
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <header className="mb-5">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.22em] text-sky-700"><Sparkles className="size-4"/>The Innozanzi edit · live stock</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(310px,.9fr)] lg:gap-5">
        <Link href={productHref(lead)} className="group relative grid min-h-[34rem] overflow-hidden rounded-[2rem] bg-[#06182e] text-white shadow-xl shadow-slate-950/10 sm:min-h-[31rem] sm:grid-cols-[minmax(0,.88fr)_minmax(0,1.12fr)]">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgba(14,165,233,.28),transparent_38%),linear-gradient(135deg,#06182e_0%,#0a2748_58%,#075985_100%)]"/>
          <div className="relative z-10 flex flex-col p-7 sm:p-9 lg:p-10">
            <div className="flex flex-wrap gap-2"><span className="rounded-full bg-sky-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-[#06182e]">Flagship pick</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-sky-100">In stock now</span></div>
            <p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-sky-300">{lead.brand?.name ?? lead.category.name}</p>
            <h2 className="mt-3 text-2xl font-black leading-[1.08] tracking-tight sm:text-3xl lg:text-[2rem]">{lead.name}</h2>
            <div className="mt-auto pt-7">{leadPrice ? <><p className="text-xs text-sky-100">Own standout technology from</p><p className="mt-1 text-3xl font-black tracking-tight">{formatZar(leadPrice)}</p></> : null}<span className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#06182e] transition group-hover:bg-sky-300">See the flagship <ArrowRight className="size-4 transition group-hover:translate-x-1"/></span></div>
          </div>
          <div className="relative min-h-72 overflow-hidden sm:min-h-0"><div aria-hidden="true" className="absolute inset-5 rounded-[2rem] bg-white/95 shadow-2xl shadow-sky-950/30 sm:inset-7 sm:left-2"/>{leadImage ? <Image src={leadImage.path} alt={leadImage.altText ?? lead.name} fill priority sizes="(max-width: 639px) 100vw, (max-width: 1279px) 55vw, 660px" className="object-contain p-10 transition duration-700 group-hover:scale-[1.035] sm:p-12 lg:p-14"/> : null}</div>
        </Link>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 lg:gap-5">{supporting.slice(0, 2).map(product => <SupportingSpotlight key={product.id} product={product}/>)}</div>
      </div>

      <nav aria-label="Shop technology by goal" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{pathways.map(({ label, detail, href, icon: Icon }) => <Link href={href} key={label} className="group flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:shadow-md"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-800"><Icon className="size-5"/></span><span className="min-w-0"><strong className="block text-sm leading-tight text-slate-950">{label}</strong><small className="mt-1 hidden leading-4 text-slate-500 lg:block">{detail}</small></span></Link>)}</nav>
    </div>
  </section>;
}
