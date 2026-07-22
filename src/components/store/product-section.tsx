import Link from "next/link";
import type { ProductCardData } from "@/domain/catalogue/queries";
import { ProductCard } from "./product-card";

export function ProductSection({ title, eyebrow, products, href = "/shop" }: { title: string; eyebrow?: string; products: ProductCardData[]; href?: string }) {
  if (!products.length) return null;
  return <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="mb-6 flex items-end justify-between"><div>{eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">{eyebrow}</p>}<h2 className="mt-1 text-2xl font-bold text-zinc-950 sm:text-3xl">{title}</h2></div><Link className="text-sm font-semibold text-emerald-800 hover:underline" href={href}>View all</Link></div><div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><>{products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</></div></section>;
}
