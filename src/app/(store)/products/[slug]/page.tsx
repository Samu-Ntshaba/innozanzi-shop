import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, ChevronRight, CreditCard, PackageCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductShare } from "@/components/store/product-share";
import { ProductReviews } from "@/components/store/product-reviews";
import { getAuthContext } from "@/domain/auth/session";
import { addToCartAction } from "@/domain/cart/actions";
import { activeUnitPrice } from "@/domain/cart/calculations";
import { getProductBySlug } from "@/domain/catalogue/queries";
import { entityMetadata } from "@/domain/marketing/seo";
import { formatZar } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { robots: { index: false, follow: false } };
  return entityMetadata({ entityType: "PRODUCT", entityId: product.id, path: `/products/${product.slug}`, title: product.metaTitle ?? `${product.name} — Buy Online`, description: product.metaDescription ?? product.shortDescription ?? `Buy ${product.name} online from Innozanzi with secure payment and nationwide delivery.`, image: `/api/social/products/${product.slug}`, keywords: [product.brand?.name ?? "", product.category.name, product.name, product.sku, "buy online", "South Africa"] });
}

const Benefit = ({ icon: Icon, title, children }: { icon: typeof Truck; title: string; children: React.ReactNode }) => <div className="flex gap-2.5"><Icon className="mt-0.5 size-5 shrink-0 text-sky-700"/><span><strong className="block">{title}</strong><small className="text-slate-500">{children}</small></span></div>;

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ review?: string }> }) {
  const [product, context, query] = await Promise.all([getProductBySlug((await params).slug), getAuthContext(), searchParams]); if (!product) notFound();
  const base = product.inventory[0];
  const price = activeUnitPrice(product);
  const available = product.variants.length ? product.variants.reduce((sum, variant) => sum + Math.max(0, (variant.inventory?.onHand ?? 0) - (variant.inventory?.reserved ?? 0)), 0) : Math.max(0, (base?.onHand ?? 0) - (base?.reserved ?? 0));
  const onSale = price.lt(product.regularPrice);
  const saving = onSale ? product.regularPrice.minus(price) : null;
  return <main className="bg-white pb-14"><div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm text-slate-500"><Link className="shrink-0 hover:text-sky-700" href="/shop">Shop</Link><ChevronRight className="size-3.5 shrink-0"/><Link className="shrink-0 hover:text-sky-700" href={`/categories/${product.category.slug}`}>{product.category.name}</Link><ChevronRight className="size-3.5 shrink-0"/><span className="truncate text-slate-700">{product.name}</span></nav>
    <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,.92fr)] lg:gap-12">
      <ProductGallery images={product.images.map(image => image.path)} name={product.name}/>
      <section className="lg:sticky lg:top-28">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">{product.brand?.name ?? product.category.name}</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">{product.name}</h1>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500"><span>SKU: {product.sku}</span>{product.conditionLabel ? <span>{product.conditionLabel}</span> : null}</div>
        <div className="mt-6 border-y border-slate-200 py-5"><div className="flex flex-wrap items-end gap-3"><p className="text-4xl font-black tracking-tight text-slate-950">{formatZar(price)}</p>{onSale ? <p className="pb-1 text-lg text-slate-400 line-through">{formatZar(product.regularPrice)}</p> : null}</div>{saving ? <p className="mt-1 text-sm font-semibold text-emerald-700">You save {formatZar(saving)}</p> : null}<p className="mt-1 text-xs text-slate-500">Final price shown. Secure payment at checkout.</p></div>
        <div className={`mt-5 flex items-center gap-2 text-sm font-semibold ${available > 0 ? "text-emerald-700" : "text-amber-700"}`}><span className={`grid size-6 place-items-center rounded-full ${available > 0 ? "bg-emerald-100" : "bg-amber-100"}`}><Check className="size-4"/></span>{available > 0 ? `${available} in stock and ready to order` : "Currently unavailable"}</div>
        {product.shortDescription ? <p className="mt-5 text-base leading-7 text-slate-600">{product.shortDescription}</p> : null}
        <form action={addToCartAction} className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4"><input type="hidden" name="productId" value={product.id}/>{product.variants.length ? <label className="block text-sm font-semibold text-slate-800">Choose an option<select className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3" name="variantId" required><option value="">Select an option</option>{product.variants.map(variant => { const count = Math.max(0, (variant.inventory?.onHand ?? 0) - (variant.inventory?.reserved ?? 0)); return <option key={variant.id} value={variant.id} disabled={!count}>{variant.name} — {count} available</option>; })}</select></label> : null}<div className={`${product.variants.length ? "mt-4" : ""} grid grid-cols-[88px_1fr] gap-3`}><input aria-label="Quantity" className="h-13 rounded-lg border border-slate-300 bg-white px-3 text-center" type="number" name="quantity" min={1} max={Math.max(1, available)} defaultValue={1}/><button disabled={!available} className="h-13 rounded-lg bg-sky-700 px-6 text-base font-bold text-white transition hover:bg-sky-800 disabled:bg-slate-400">Add to cart</button></div></form>
        <div className="mt-5 grid grid-cols-2 gap-4 text-sm"><Benefit icon={Truck} title="Nationwide delivery">{product.deliveryEstimate ?? "Tracked fulfilment"}</Benefit><Benefit icon={ShieldCheck} title="Warranty">{product.warranty ?? "Supplier backed"}</Benefit><Benefit icon={CreditCard} title="Secure payment">Paystack or EFT</Benefit><Benefit icon={RotateCcw} title="Returns support"><Link className="text-sky-700 underline" href="/returns-policy">View policy</Link></Benefit></div>
        <ProductShare title={product.name} path={`/products/${product.slug}`}/>
      </section>
    </div>
    <div className="mt-14 grid items-start gap-10 border-t border-slate-200 pt-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]"><section><h2 className="text-2xl font-bold text-slate-950">About this product</h2><div className="mt-4 whitespace-pre-line leading-8 text-slate-700">{product.description ?? product.shortDescription ?? "A reliable technology product supplied and supported by Innozanzi."}</div></section><aside className="self-start rounded-2xl bg-[#071b33] p-6 text-white"><PackageCheck className="size-7 text-sky-300"/><h2 className="mt-4 text-xl font-bold">Buy with confidence</h2><p className="mt-2 text-sm leading-6 text-slate-300">Stock and pricing are checked again when your order is placed. You receive an order reference and can follow fulfilment from your account.</p></aside></div>
    {product.specifications.length ? <section className="mt-12"><h2 className="text-2xl font-bold text-slate-950">Technical specifications</h2><dl className="mt-5 overflow-hidden rounded-xl border border-slate-200">{product.specifications.map((specification, index) => <div key={specification.id} className={`grid gap-1 px-4 py-3 sm:grid-cols-[minmax(180px,.4fr)_1fr] sm:gap-6 ${index % 2 ? "bg-slate-50" : "bg-white"}`}><dt className="font-semibold text-slate-800">{specification.name}</dt><dd className="text-slate-600">{specification.value}</dd></div>)}</dl></section> : null}
    <ProductReviews productId={product.id} sourceType="LOCAL" path={`/products/${product.slug}`} reviews={product.reviews} signedIn={Boolean(context)} submitted={query.review === "submitted"}/>
  </div></main>;
}
