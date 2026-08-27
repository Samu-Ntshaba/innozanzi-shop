import Link from "next/link";
import type { ProductCardData } from "@/domain/catalogue/queries";
import { ProductCard } from "./product-card";

export function ProductSection({ title, eyebrow, products, href = "/shop" }: { title?: string; eyebrow?: string; products: ProductCardData[]; href?: string }) {
  if (!products.length) return null;
  return <section aria-label={title??"Featured products"} className="mx-auto max-w-7xl py-7 sm:px-6 sm:py-12 lg:px-8"><div className="mb-4 flex items-end justify-between gap-3 px-4 sm:px-0"><div className="min-w-0">{eyebrow && <p className="text-xs font-medium text-sky-800 sm:text-sm">{eyebrow}</p>}{title && <h2 className="mt-1 text-xl font-semibold text-slate-950 sm:text-3xl">{title}</h2>}</div><Link className="shrink-0 text-sm font-semibold text-sky-800 hover:underline" href={href}>View all</Link></div><div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] min-[480px]:grid min-[480px]:grid-cols-2 min-[480px]:overflow-visible min-[480px]:px-0 lg:grid-cols-4">{products.slice(0, 4).map((product) => <div className="min-w-[78vw] max-w-[19rem] snap-start min-[480px]:min-w-0 min-[480px]:max-w-none" key={product.id}><ProductCard product={product} /></div>)}</div></section>;
}
