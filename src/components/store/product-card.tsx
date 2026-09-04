import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, PackageX } from "lucide-react";
import type { ProductCardData } from "@/domain/catalogue/queries";
import { formatZar } from "@/lib/money";

export function ProductCard({ product,recommendationId }: { product: ProductCardData;recommendationId?:string }) {
  const base="source" in product&&product.source==="supplier"?`/supplier-products/${product.slug}`:`/products/${product.slug}`,href=recommendationId?`${base}?recommendation=${recommendationId}`:base;
  const image = product.images[0];
  const inStock = product.stockStatus === "IN_STOCK" || product.stockStatus === "LOW_STOCK";
  const now=new Date();const saleActive=product.salePrice&&(!product.saleStartsAt||product.saleStartsAt<=now)&&(!product.saleEndsAt||product.saleEndsAt>=now);const price=saleActive?product.salePrice:product.regularPrice;
  const regular=product.regularPrice?Number(product.regularPrice.toString()):null,sale=saleActive?Number(product.salePrice!.toString()):null;
  const savingPercent=regular&&sale&&sale<regular?Math.round((1-sale/regular)*100):null;
  const flags=product.marketingFlags??[];
  const badge=saleActive?{label:savingPercent?`Save ${savingPercent}%`:"Promotion",tone:"bg-emerald-600 text-white"}:flags.includes("UNBOXED")?{label:"Unboxed",tone:"bg-sky-700 text-white"}:flags.includes("LAST_CHANCE")?{label:"Last chance",tone:"bg-amber-500 text-slate-950"}:flags.includes("SPECIAL")?{label:"Special",tone:"bg-slate-800 text-white"}:null;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-slate-400 hover:shadow-md">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-white sm:aspect-square">
        {badge?<span className={`absolute left-2 top-2 z-10 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide shadow-sm sm:left-3 sm:top-3 sm:text-[10px] ${badge.tone}`}>{badge.label}</span>:null}
        {image ? <Image src={image.path} alt={image.altText ?? product.name} fill sizes="(max-width: 479px) 50vw, (max-width: 1023px) 50vw, 25vw" className="object-contain p-2 transition duration-300 group-hover:scale-105 sm:p-5" /> : <div className="grid h-full place-items-center bg-slate-50 px-2 text-center text-[10px] text-slate-400">Image coming soon</div>}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col border-t border-slate-100 p-2.5 sm:p-4">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]">{product.brand?.name ?? product.category.name}</p>
        <Link href={href} className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-900 group-hover:text-sky-800 sm:min-h-12 sm:text-base sm:leading-6">{product.name}</Link>
        <p className="mt-1 hidden text-xs text-slate-400 sm:block">SKU: {product.sku}</p>
        <p className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-600">
          {inStock ? <Check className="size-3.5" /> : <PackageX className="size-3.5" />}{inStock ? "In stock" : "Check availability"}
        </p>
        <div className="mt-auto pt-3 sm:pt-4">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">{price?<><p className="text-base font-bold tracking-tight text-slate-950 sm:text-xl">{formatZar(price.toString())}</p>{saleActive&&product.regularPrice?<p className="text-[10px] text-slate-500 line-through sm:text-xs">{formatZar(product.regularPrice.toString())}</p>:<p className="hidden text-[11px] text-slate-500 sm:block">VAT included</p>}</>:<p className="text-sm font-semibold tracking-tight text-slate-950 sm:text-base">Request price</p>}</div>
            <Link aria-label={`View ${product.name}`} href={href} className="grid size-10 shrink-0 place-items-center rounded-md border border-slate-300 text-slate-800 hover:border-sky-700 hover:text-sky-800 sm:size-11"><ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </div>
    </article>
  );
}
