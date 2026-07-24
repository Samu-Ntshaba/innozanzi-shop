import Link from "next/link";
import type { ProductCardData } from "@/domain/catalogue/queries";
import { ProductCard } from "./product-card";

export function ProductSection({ title, eyebrow, products, href = "/shop" }: { title?: string; eyebrow?: string; products: ProductCardData[]; href?: string }) {
  if (!products.length) return null;
  return <section aria-label="Featured products" className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12 lg:px-8"><div className="mb-4 flex items-end justify-between gap-3"><div className="min-w-0">{eyebrow && <p className="text-xs font-medium text-sky-800 sm:text-sm">{eyebrow}</p>}{title && <h2 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">{title}</h2>}</div><Link className="shrink-0 text-sm font-semibold text-sky-800 hover:underline" href={href}>View all products</Link></div><div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">{products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div></section>;
}
