import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, PackageX } from "lucide-react";
import { formatZar } from "@/lib/money";
import type { ProductCardData } from "@/domain/catalogue/queries";

function activeSale(product: ProductCardData) {
  const now = new Date();
  return product.salePrice && (!product.saleStartsAt || product.saleStartsAt <= now) && (!product.saleEndsAt || product.saleEndsAt >= now);
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images[0];
  const onSale = activeSale(product);
  const inStock = product.stockStatus === "IN_STOCK" || product.stockStatus === "LOW_STOCK";
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-sky-300 hover:shadow-xl">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-white">
        {image ? <Image src={image.path} alt={image.altText ?? product.name} fill sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw" className="object-contain p-4 transition duration-300 group-hover:scale-105 sm:p-5" /> : <div className="grid h-full place-items-center bg-slate-50 px-3 text-center text-xs text-slate-400">Product image coming soon</div>}
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {onSale && <span className="rounded bg-red-600 px-2 py-1 text-[11px] font-bold uppercase text-white">On sale</span>}
        </div>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col border-t border-slate-100 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-sky-600">{product.brand?.name ?? product.category.name}</p>
        <Link href={`/products/${product.slug}`} className="mt-1 line-clamp-2 min-h-12 font-semibold leading-6 text-slate-900 group-hover:text-sky-700">{product.name}</Link>
        <p className="mt-1 text-xs text-slate-400">SKU: {product.sku}</p>
        <p className={`mt-3 flex items-center gap-1 text-xs font-semibold ${inStock ? "text-emerald-700" : "text-red-600"}`}>
          {inStock ? <Check className="size-3.5" /> : <PackageX className="size-3.5" />}{inStock ? "In stock" : "Check availability"}
        </p>
        <div className="mt-auto pt-4">
          {onSale && <span className="text-xs text-slate-400 line-through">{formatZar(product.regularPrice.toString())}</span>}
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0"><p className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">{formatZar(onSale ? product.salePrice!.toString() : product.regularPrice.toString())}</p><p className="text-[11px] text-slate-500">VAT included</p></div>
            <Link aria-label={`View ${product.name}`} href={`/products/${product.slug}`} className="grid size-10 place-items-center rounded-lg bg-sky-600 text-white hover:bg-sky-700"><ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </div>
    </article>
  );
}
