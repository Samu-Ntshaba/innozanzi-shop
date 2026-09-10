import { DeliveryBenefit } from "@/components/store/delivery-benefit";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, ChevronRight, CreditCard, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductShare } from "@/components/store/product-share";
import { ProductReviews } from "@/components/store/product-reviews";
import { canAccessTestProducts, getAuthContext } from "@/domain/auth/session";
import { addToCartAction } from "@/domain/cart/actions";
import { activeUnitPrice } from "@/domain/cart/calculations";
import { getProductBySlug } from "@/domain/catalogue/queries";
import { entityMetadata } from "@/domain/marketing/seo";
import { formatZar } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { robots: { index: false, follow: false } };
  return entityMetadata({ entityType: "PRODUCT", entityId: product.id, path: `/products/${product.slug}`, title: product.metaTitle ?? `${product.name} — Buy Online`, description: product.metaDescription ?? product.shortDescription ?? `Buy ${product.name} online from Innozanzi with secure payment and delivery in selected South African provinces.`, image: `/api/social/products/${product.slug}`, keywords: [product.brand?.name ?? "", product.category.name, product.name, product.sku, "buy online", "South Africa"] });
}

const Benefit = ({ icon: Icon, title, children }: { icon: typeof Truck; title: string; children: React.ReactNode }) => <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3.5"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700"><Icon className="size-4.5"/></span><span><strong className="block text-sm text-slate-900">{title}</strong><small className="mt-0.5 block leading-5 text-slate-500">{children}</small></span></div>;

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ review?: string }> }) {
  const [context, query, route] = await Promise.all([getAuthContext(), searchParams, params]);
  const product = await getProductBySlug(route.slug, canAccessTestProducts(context)); if (!product) notFound();
  const base = product.inventory[0];
  const price = activeUnitPrice(product);
  const available = product.variants.length ? product.variants.reduce((sum, variant) => sum + Math.max(0, (variant.inventory?.onHand ?? 0) - (variant.inventory?.reserved ?? 0)), 0) : Math.max(0, (base?.onHand ?? 0) - (base?.reserved ?? 0));
  const onSale = price.lt(product.regularPrice);
  const saving = onSale ? product.regularPrice.minus(price) : null;
  return <main className="bg-slate-50 pb-20"><div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm text-slate-500"><Link className="shrink-0 hover:text-sky-700" href="/shop">Shop</Link><ChevronRight className="size-3.5 shrink-0"/><Link className="min-w-0 truncate hover:text-sky-700" href={product.isTestData ? "/shop" : `/categories/${product.category.slug}`}>{product.category.name}</Link><ChevronRight className="size-3.5 shrink-0"/><span className="hidden truncate text-slate-700 sm:block">{product.name}</span></nav>
    <div className="mt-5 grid items-start gap-7 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,.92fr)] lg:gap-10 lg:p-8">
      <ProductGallery images={product.images.map(image => image.path)} name={product.name}/>
      <section className="rounded-2xl bg-slate-50 p-5 sm:p-7 lg:sticky lg:top-28">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">{product.isTestData ? "Private payment test" : product.brand?.name ?? product.category.name}</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">{product.name}</h1>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500"><span>SKU: {product.sku}</span>{product.conditionLabel ? <span>{product.conditionLabel}</span> : null}</div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-end gap-3"><p className="text-4xl font-black tracking-tight text-slate-950">{formatZar(price)}</p>{onSale ? <p className="pb-1 text-lg text-slate-400 line-through">{formatZar(product.regularPrice)}</p> : null}</div>{saving ? <p className="mt-1 text-sm font-semibold text-emerald-700">You save {formatZar(saving)}</p> : null}</div>
        <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${available > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}><span className={`grid size-5 place-items-center rounded-full ${available > 0 ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}><Check className="size-3.5"/></span>{available > 0 ? `${available} in stock and ready to order` : "Currently unavailable"}</div>
        {product.shortDescription ? <p className="mt-5 text-base leading-7 text-slate-600">{product.shortDescription}</p> : null}
        <form action={addToCartAction} className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><input type="hidden" name="productId" value={product.id}/>{product.variants.length ? <label className="block text-sm font-semibold text-slate-800">Choose an option<select className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3" name="variantId" required><option value="">Select an option</option>{product.variants.map(variant => { const count = Math.max(0, (variant.inventory?.onHand ?? 0) - (variant.inventory?.reserved ?? 0)); return <option key={variant.id} value={variant.id} disabled={!count}>{variant.name} — {count} available</option>; })}</select></label> : null}<div className={`${product.variants.length ? "mt-4" : ""} grid grid-cols-[88px_1fr] gap-3`}><input aria-label="Quantity" className="h-13 rounded-xl border border-slate-300 bg-white px-3 text-center" type="number" name="quantity" min={1} max={Math.max(1, available)} defaultValue={1}/><button disabled={!available} className="h-13 rounded-xl bg-sky-700 px-6 text-base font-black text-white shadow-sm transition hover:bg-sky-800 disabled:bg-slate-400">Add to cart</button></div></form>
        <div className="mt-5 grid gap-2.5 text-sm sm:grid-cols-2"><Benefit icon={Truck} title="Delivery coverage"><DeliveryBenefit/></Benefit><Benefit icon={ShieldCheck} title="Warranty">{product.warranty ?? "Supplier backed"}</Benefit><Benefit icon={CreditCard} title="Secure payment">Pay securely with Ozow</Benefit><Benefit icon={RotateCcw} title="Returns support"><Link className="text-sky-700 underline" href="/returns-policy">View policy</Link></Benefit></div>
        <ProductShare title={product.name} path={`/products/${product.slug}`}/>
      </section>
    </div>
    <nav aria-label="Product information" className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"><a className="whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-800" href="#overview">Overview</a>{product.specifications.length ? <a className="whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-800" href="#specifications">Specifications</a> : null}<a className="whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-800" href="#reviews">Reviews ({product.reviews.length})</a></nav>
    <section id="overview" className="mt-6 scroll-mt-32 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-black uppercase tracking-[.18em] text-sky-700">Product details</p><h2 className="mt-2 text-2xl font-black text-slate-950">About this product</h2><div className="mt-4 max-w-4xl whitespace-pre-line leading-8 text-slate-700">{product.description ?? product.shortDescription ?? "Product information is currently unavailable."}</div></section>
    {product.specifications.length ? <section id="specifications" className="mt-6 scroll-mt-32 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-black uppercase tracking-[.18em] text-sky-700">Product details</p><h2 className="mt-2 text-2xl font-black text-slate-950">Technical specifications</h2><dl className="mt-5 overflow-hidden rounded-2xl border border-slate-200">{product.specifications.map((specification, index) => <div key={specification.id} className={`grid gap-1 px-4 py-3.5 sm:grid-cols-[minmax(180px,.4fr)_1fr] sm:gap-6 ${index % 2 ? "bg-slate-50" : "bg-white"}`}><dt className="font-semibold text-slate-800">{specification.name}</dt><dd className="text-slate-600">{specification.value}</dd></div>)}</dl></section> : null}
    <div className="mt-6"><ProductReviews productId={product.id} sourceType="LOCAL" path={`/products/${product.slug}`} reviews={product.reviews} signedIn={Boolean(context)} submitted={query.review === "submitted"}/></div>
  </div></main>;
}
