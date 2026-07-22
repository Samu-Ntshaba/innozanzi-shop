import Image from "next/image";
import Link from "next/link";
import { formatZar } from "@/lib/money";
import type { ProductCardData } from "@/domain/catalogue/queries";

function activeSale(product: ProductCardData) {
  const now = new Date();
  return product.salePrice && (!product.saleStartsAt || product.saleStartsAt <= now) && (!product.saleEndsAt || product.saleEndsAt >= now);
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images[0];
  const onSale = activeSale(product);
  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square bg-zinc-100">
          {image ? <Image src={image.path} alt={image.altText ?? product.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-contain p-6" /> : <div className="grid h-full place-items-center text-sm text-zinc-400">Image coming soon</div>}
          {onSale && <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">Special</span>}
        </div>
        <div className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-600">{product.brand?.name ?? product.category.name}</p>
          <h3 className="mt-1 line-clamp-2 min-h-12 font-semibold text-zinc-950 group-hover:text-sky-700">{product.name}</h3>
          <p className="mt-1 text-xs text-zinc-500">SKU {product.sku}</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-lg font-bold text-zinc-950">{formatZar(onSale ? product.salePrice!.toString() : product.regularPrice.toString())}</span>
            {onSale && <span className="text-sm text-zinc-500 line-through">{formatZar(product.regularPrice.toString())}</span>}
          </div>
          <p className="mt-1 text-xs text-zinc-500">VAT included</p>
        </div>
      </Link>
    </article>
  );
}
