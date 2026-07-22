import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { addToCartAction } from "@/domain/cart/actions";
import { getProductBySlug } from "@/domain/catalogue/queries";
import { formatZar } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return {};
  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
  return { title: product.metaTitle ?? product.name, description: product.metaDescription ?? product.shortDescription, alternates: { canonical: `/products/${product.slug}` }, openGraph: { title: product.name, description: product.shortDescription ?? undefined, images: image ? [image.path] : [] } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const now = new Date();
  const onSale = product.salePrice && (!product.saleStartsAt || product.saleStartsAt <= now) && (!product.saleEndsAt || product.saleEndsAt >= now);
  const price = onSale ? product.salePrice! : product.regularPrice;
  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0];
  const baseInventory = product.inventory[0];
  const available = baseInventory ? Math.max(0, baseInventory.onHand - baseInventory.reserved) : 0;

  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><nav className="mb-6 text-sm text-zinc-500"><Link href="/shop">Shop</Link> / <Link href={`/categories/${product.category.slug}`}>{product.category.name}</Link> / {product.name}</nav><div className="grid gap-10 lg:grid-cols-2"><section><div className="relative aspect-square overflow-hidden rounded-3xl bg-zinc-100">{primaryImage ? <Image src={primaryImage.path} alt={primaryImage.altText ?? product.name} fill sizes="50vw" className="object-contain p-10" priority /> : <div className="grid h-full place-items-center text-zinc-400">Image coming soon</div>}</div></section><section><p className="text-sm font-semibold uppercase tracking-wider text-sky-600">{product.brand?.name ?? product.category.name}</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1><p className="mt-2 text-sm text-zinc-500">SKU {product.sku}</p><div className="mt-6 flex items-baseline gap-3"><span className="text-3xl font-black">{formatZar(price.toString())}</span>{onSale && <span className="text-lg text-zinc-500 line-through">{formatZar(product.regularPrice.toString())}</span>}</div><p className="mt-1 text-sm text-zinc-500">VAT included</p><p className="mt-6 leading-7 text-zinc-700">{product.shortDescription ?? "Reliable technology supplied and supported by Innozanzi."}</p><p className={`mt-5 text-sm font-semibold ${available > 0 ? "text-sky-600" : "text-amber-700"}`}>{available > 0 ? `${available} available` : product.stockStatus.replaceAll("_", " ")}</p><form action={addToCartAction} className="mt-6 space-y-4"><input type="hidden" name="productId" value={product.id} />{product.variants.length > 0 && <select className="h-12 w-full rounded-lg border border-zinc-300 px-3" name="variantId" required><option value="">Select an option</option>{product.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</select>}<div className="flex gap-3"><input className="h-12 w-24 rounded-lg border border-zinc-300 px-3" type="number" name="quantity" min={1} max={99} defaultValue={1} /><button className="h-12 flex-1 rounded-lg bg-sky-600 px-6 font-semibold text-white hover:bg-sky-700" type="submit">Add to cart</button></div></form><Link href={`/quotations/request?product=${product.slug}`} className="mt-3 block text-center text-sm font-semibold text-sky-700 underline">Request a bulk quotation</Link><div className="mt-8 grid gap-3 sm:grid-cols-3">{[[Truck,"Delivery",product.deliveryEstimate ?? "Calculated at checkout"],[ShieldCheck,"Warranty",product.warranty ?? "Supplier warranty"],[PackageCheck,"Stock","Verified before checkout"]].map(([Icon,label,text]) => { const ItemIcon = Icon as typeof Truck; return <div key={label as string} className="rounded-xl bg-zinc-50 p-4"><ItemIcon className="size-5 text-sky-600" /><p className="mt-2 text-sm font-semibold">{label as string}</p><p className="text-xs text-zinc-600">{text as string}</p></div>; })}</div></section></div>{product.description && <section className="mt-14 border-t border-zinc-200 pt-10"><h2 className="text-2xl font-bold">Product details</h2><div className="mt-4 max-w-4xl whitespace-pre-line leading-7 text-zinc-700">{product.description}</div></section>}{product.specifications.length > 0 && <section className="mt-10"><h2 className="text-2xl font-bold">Technical specifications</h2><dl className="mt-4 max-w-4xl divide-y divide-zinc-200 rounded-2xl border border-zinc-200">{product.specifications.map((spec) => <div key={spec.id} className="grid grid-cols-2 gap-4 p-4"><dt className="font-medium">{spec.name}</dt><dd className="text-zinc-600">{spec.value}</dd></div>)}</dl></section>}{product.documents.length > 0 && <section className="mt-10"><h2 className="text-2xl font-bold">Documents</h2><div className="mt-4 space-y-2">{product.documents.map((document) => <a key={document.id} href={document.path} className="flex items-center gap-2 text-sky-700 underline"><FileDown className="size-4" />{document.name}</a>)}</div></section>}</main>;
}
