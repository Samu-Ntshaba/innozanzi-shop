import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Check, ChevronRight, CreditCard, PackageCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductShare } from "@/components/store/product-share";
import { ProductReviews } from "@/components/store/product-reviews";
import { getAuthContext } from "@/domain/auth/session";
import { addSupplierCartItemAction } from "@/domain/cart/actions";
import { isDailySpecial, supplierRetailPrice } from "@/domain/catalogue/retail-pricing";
import { entityMetadata } from "@/domain/marketing/seo";
import { formatZar } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { safeSupplierHtml } from "@/lib/safe-supplier-html";
import { BehaviourSignal } from "@/components/store/behaviour-signal";
import { RecommendationSection } from "@/components/store/recommendation-section";
import { getRecommendations } from "@/domain/recommendations/service";
import { ProductPathways } from "@/components/store/product-pathways";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await prisma.supplierCatalogueProduct.findFirst({ where: { slug: (await params).slug, active: true } });
  if (!product) return { robots: { index: false, follow: false } };
  const description = (product.shortDescription ?? product.description ?? `Buy ${product.name} online with secure payment and delivery across South Africa.`).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  return entityMetadata({ entityType: "SUPPLIER_PRODUCT", entityId: product.id, path: `/supplier-products/${product.slug}`, title: `${product.name} — Buy Online`, description, image: `/api/social/supplier-products/${product.slug}`, keywords: [product.name, product.supplierSku, product.manufacturerSku ?? "", product.brand ?? "", product.category ?? "", "buy online", "South Africa"] });
}

const Benefit = ({ icon: Icon, title, children }: { icon: typeof Truck; title: string; children: React.ReactNode }) => <div className="flex gap-2.5"><Icon className="mt-0.5 size-5 shrink-0 text-sky-700"/><span><strong className="block">{title}</strong><small className="text-slate-500">{children}</small></span></div>;

export default async function SupplierProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ review?: string;recommendation?:string }> }) {
  const [product, context, query] = await Promise.all([prisma.supplierCatalogueProduct.findFirst({ where: { slug: (await params).slug, active: true }, include: { supplier: { select: { companyName: true } }, reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } } } }), getAuthContext(), searchParams]); if (!product) notFound();
  const price = product.costPrice ? supplierRetailPrice({ costPrice: product.costPrice, recommendedRetail: product.recommendedRetail, promotionalPrice: product.promotionalPrice, promotionStartsAt: product.promotionStartsAt, promotionEndsAt: product.promotionEndsAt, special: isDailySpecial(product.id) }) : null;
  const recommendations=await getRecommendations({limit:4,category:product.category??undefined,brand:product.brand??undefined,excludeIds:[product.id],context:"product"});
  const current = price?.salePrice ?? price?.regularPrice;
  const saving = price?.salePrice ? price.regularPrice.minus(price.salePrice) : null;
  const specs = product.specifications && typeof product.specifications === "object" && !Array.isArray(product.specifications) ? Object.entries(product.specifications as Record<string, unknown>) : [];
  return <main className="bg-white pb-14"><BehaviourSignal signal={{eventType:"VIEW",entityType:"SUPPLIER_PRODUCT",entityId:product.id,category:product.category??undefined,brand:product.brand??undefined,price:current?Number(current):undefined,context:"product"}}/>{query.recommendation?<BehaviourSignal signal={{eventType:"RECOMMENDATION_CLICK",entityType:"SUPPLIER_PRODUCT",entityId:product.id,recommendationId:query.recommendation,category:product.category??undefined,brand:product.brand??undefined,context:"product"}}/>:null}<div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm text-slate-500"><Link className="shrink-0 hover:text-sky-700" href="/shop">Shop</Link><ChevronRight className="size-3.5 shrink-0"/><Link className="shrink-0 hover:text-sky-700" href={`/categories/${encodeURIComponent(product.category ?? "Catalogue")}`}>{product.category ?? "Catalogue"}</Link><ChevronRight className="size-3.5 shrink-0"/><span className="truncate text-slate-700">{product.name}</span></nav>
    <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,.92fr)] lg:gap-12"><ProductGallery images={product.images} name={product.name}/><section className="lg:sticky lg:top-28">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">{product.brand ?? product.category ?? product.supplier.companyName}</p><h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">{product.name}</h1><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500"><span>SKU: {product.supplierSku}</span>{product.manufacturerSku ? <span>MPN: {product.manufacturerSku}</span> : null}</div>
      <div className="mt-6 border-y border-slate-200 py-5">{current ? <><div className="flex flex-wrap items-end gap-3"><p className="text-4xl font-black tracking-tight text-slate-950">{formatZar(current)}</p>{price?.salePrice ? <p className="pb-1 text-lg text-slate-400 line-through">{formatZar(price.regularPrice)}</p> : null}</div>{saving ? <p className="mt-1 text-sm font-semibold text-emerald-700">Daily deal — save {formatZar(saving)}</p> : null}<p className="mt-1 text-xs text-slate-500">Final price shown. Secure payment at checkout.</p></> : <p className="font-semibold text-amber-800">Temporarily unavailable for online purchase.</p>}</div>
      <div className={`mt-5 flex items-center gap-2 text-sm font-semibold ${product.stock > 0 ? "text-emerald-700" : "text-amber-700"}`}><span className={`grid size-6 place-items-center rounded-full ${product.stock > 0 ? "bg-emerald-100" : "bg-amber-100"}`}><Check className="size-4"/></span>{product.stock > 0 ? `${product.stock} in supplier stock and ready to order` : "Currently unavailable"}</div>
      {product.shortDescription ? <div className="mt-5 line-clamp-5 text-base leading-7 text-slate-600" dangerouslySetInnerHTML={{ __html: safeSupplierHtml(product.shortDescription) }}/> : null}
      {current && product.stock > 0 ? <form action={addSupplierCartItemAction} className="mt-6 grid grid-cols-[88px_1fr] gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><input type="hidden" name="productId" value={product.id}/><input aria-label="Quantity" className="h-13 rounded-lg border border-slate-300 bg-white px-3 text-center" name="quantity" type="number" min="1" max={product.stock} defaultValue="1"/><button className="h-13 rounded-lg bg-sky-700 px-6 text-base font-bold text-white transition hover:bg-sky-800">Add to cart</button></form> : null}
      <div className="mt-5 grid grid-cols-2 gap-4 text-sm"><Benefit icon={Truck} title="Nationwide delivery">Free from R1,500 · R100 below</Benefit><Benefit icon={ShieldCheck} title="Warranty">{product.warranty ?? "Supplier backed"}</Benefit><Benefit icon={CreditCard} title="Secure payment">Paystack or EFT</Benefit><Benefit icon={RotateCcw} title="Returns support"><Link className="text-sky-700 underline" href="/returns-policy">View policy</Link></Benefit></div><ProductShare title={product.name} path={`/supplier-products/${product.slug}`}/>
    </section></div>
    <div className="mt-14 grid items-start gap-10 border-t border-slate-200 pt-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]"><section><h2 className="text-2xl font-bold text-slate-950">About this product</h2>{product.description ? <div className="prose prose-slate mt-4 max-w-none leading-8" dangerouslySetInnerHTML={{ __html: safeSupplierHtml(product.description) }}/> : <p className="mt-4 leading-8 text-slate-700">A reliable technology product supplied and supported by Innozanzi.</p>}</section><aside className="self-start rounded-2xl bg-[#071b33] p-6 text-white"><PackageCheck className="size-7 text-sky-300"/><h2 className="mt-4 text-xl font-bold">Live supplier availability</h2><p className="mt-2 text-sm leading-6 text-slate-300">Stock and pricing are checked again when your order is placed. You receive an order reference and can follow fulfilment from your account.</p></aside></div>
    {specs.length ? <section className="mt-12"><h2 className="text-2xl font-bold text-slate-950">Technical specifications</h2><dl className="mt-5 overflow-hidden rounded-xl border border-slate-200">{specs.map(([name, value], index) => <div className={`grid gap-1 px-4 py-3 sm:grid-cols-[minmax(180px,.4fr)_1fr] sm:gap-6 ${index % 2 ? "bg-slate-50" : "bg-white"}`} key={name}><dt className="font-semibold capitalize text-slate-800">{name.replaceAll("-", " ")}</dt><dd className="break-words text-slate-600">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd></div>)}</dl></section> : null}
    <ProductReviews productId={product.id} sourceType="SUPPLIER" path={`/supplier-products/${product.slug}`} reviews={product.reviews} signedIn={Boolean(context)} submitted={query.review === "submitted"}/>
  </div><ProductPathways name={product.name} category={product.category}/><RecommendationSection title="Complete your setup" recommendations={recommendations}/></main>;
}
