import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, PackageX } from "lucide-react";
import type { ProductCardData } from "@/domain/catalogue/queries";
import { formatZar } from "@/lib/money";

export function ProductCard({ product }: { product: ProductCardData }) {
  const href="source" in product&&product.source==="supplier"?`/supplier-products/${product.slug}`:`/products/${product.slug}`;
  const image = product.images[0];
  const inStock = product.stockStatus === "IN_STOCK" || product.stockStatus === "LOW_STOCK";
  const now=new Date();const saleActive=product.salePrice&&(!product.saleStartsAt||product.saleStartsAt<=now)&&(!product.saleEndsAt||product.saleEndsAt>=now);const price=saleActive?product.salePrice:product.regularPrice;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-slate-400 hover:shadow-md">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-white sm:aspect-square">
        {image ? <Image src={image.path} alt={image.altText ?? product.name} fill sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw" className="object-contain p-4 transition duration-300 group-hover:scale-105 sm:p-5" /> : <div className="grid h-full place-items-center bg-slate-50 px-3 text-center text-xs text-slate-400">Product image coming soon</div>}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col border-t border-slate-100 p-3.5 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{product.brand?.name ?? product.category.name}</p>
        <Link href={href} className="mt-1 line-clamp-2 min-h-12 font-semibold leading-6 text-slate-900 group-hover:text-sky-800">{product.name}</Link>
        <p className="mt-1 text-xs text-slate-400">SKU: {product.sku}</p>
        <p className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-600">
          {inStock ? <Check className="size-3.5" /> : <PackageX className="size-3.5" />}{inStock ? "In stock" : "Check availability"}
        </p>
        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">{price?<><p className="text-xl font-bold tracking-tight text-slate-950">{formatZar(price.toString())}</p>{saleActive&&product.regularPrice?<p className="text-xs text-slate-500 line-through">{formatZar(product.regularPrice.toString())}</p>:<p className="text-[11px] text-slate-500">VAT included</p>}</>:<><p className="text-base font-semibold tracking-tight text-slate-950">Request a price</p><p className="text-[11px] text-slate-500">For this supplier item</p></>}</div>
            <Link aria-label={`View ${product.name}`} href={href} className="grid size-10 place-items-center rounded-md border border-slate-300 text-slate-800 hover:border-sky-700 hover:text-sky-800"><ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </div>
    </article>
  );
}
