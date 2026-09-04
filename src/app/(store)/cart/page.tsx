import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import Decimal from "decimal.js";
import { removeCartItemAction, updateCartItemAction, removeSupplierCartItemAction, updateSupplierCartItemAction } from "@/domain/cart/actions";
import { getCurrentCart } from "@/domain/cart/service";
import { activeUnitPrice } from "@/domain/cart/calculations";
import { resolveQuotationCart } from "@/domain/catalogue/product-source";
import { deliveryFee, FREE_DELIVERY_THRESHOLD } from "@/domain/checkout/delivery";
import { formatZar } from "@/lib/money";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
export const metadata: Metadata = { title: "Your cart", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function CartPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  await requireUser();
  const params = await searchParams;
  const cart = await getCurrentCart();
  const items = cart?.items ?? [];
  const supplierItems = cart?.supplierItems ?? [];
  const lines = cart && (items.length || supplierItems.length) ? await resolveQuotationCart(cart, new Decimal(5)) : [];
  const productTotal = lines.reduce((sum, line) => sum.plus(line.grossUnit.mul(line.quantity)), new Decimal(0));
  const delivery = deliveryFee(productTotal);
  const orderTotal = productTotal.plus(delivery);
  const supplierProducts = await prisma.supplierCatalogueProduct.findMany({ where: { OR: supplierItems.map(x => ({ supplierId: x.supplierId, supplierProductId: x.supplierProductId })) }, select: { supplierId: true, supplierProductId: true, name: true, slug: true, images: true, availability: true } });
  return <main className="mx-auto max-w-7xl px-4 pb-28 pt-7 sm:px-6 sm:py-10 lg:px-8">
    <h1 className="text-3xl font-semibold sm:text-4xl">Your cart</h1>
    {params.error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">That requested quantity is unavailable.</p> : null}
    {params.status === "added" ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Product added to your cart.</p> : null}
    {params.status === "build-added" ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Your complete PC build has been added. Review the components below, then continue to checkout.</p> : null}
    {!items.length && !supplierItems.length ? <div className="mt-8 rounded-lg border border-dashed border-slate-300 px-4 py-16 text-center"><h2 className="text-xl font-semibold">Your cart is empty</h2><Link className="mt-5 inline-block rounded-md bg-[#071b33] px-5 py-3 font-semibold text-white" href="/shop">Browse products</Link></div> :
      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">
          {items.map(item => { const image=item.product.images[0]; const inventory=item.variant?.inventory??item.product.inventory[0]; const available=inventory?Math.max(0,inventory.onHand-inventory.reserved):0; const unit=activeUnitPrice(item.product,item.variant); return <article key={item.id} className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[112px_minmax(0,1fr)_auto]"><div className="relative aspect-square rounded-md bg-slate-50">{image?<Image src={image.path} alt={item.product.name} fill sizes="112px" className="object-contain p-2"/>:null}</div><div><Link className="font-semibold hover:text-sky-700" href={`/products/${item.product.slug}`}>{item.product.name}</Link><p className="mt-1 text-sm text-zinc-600">{item.variant?.name??item.product.sku} · {available} available</p><p className="mt-2 font-semibold">{formatZar(unit)} each</p><div className="mt-3 flex flex-wrap gap-3"><form action={updateCartItemAction} className="flex items-center gap-2"><input type="hidden" name="itemId" value={item.id}/><input className="h-11 w-20 rounded-lg border px-2" name="quantity" type="number" min={1} max={available} defaultValue={item.quantity}/><button className="min-h-11 text-sm underline">Update</button></form><form action={removeCartItemAction}><input type="hidden" name="itemId" value={item.id}/><button className="min-h-11 text-sm text-red-700 underline">Remove</button></form></div></div><strong className="col-span-2 sm:col-span-1 sm:text-right">{formatZar(unit.mul(item.quantity))}</strong></article> })}
          {supplierItems.length ? <h2 className="pt-5 text-xl font-semibold">Supplier-stock items</h2> : null}
          {supplierItems.map(item => { const product=supplierProducts.find(p=>p.supplierId===item.supplierId&&p.supplierProductId===item.supplierProductId); return <article key={item.id} className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 rounded-lg border border-amber-200 p-3"><div className="relative aspect-square bg-slate-50">{product?.images[0]?<Image src={product.images[0]} alt={product.name} fill sizes="80px" className="object-contain p-2"/>:null}</div><div><Link className="font-semibold" href={product?`/supplier-products/${product.slug}`:"/shop"}>{product?.name??item.supplierSku}</Link><p className="text-sm text-slate-500">Live price is confirmed securely at checkout</p><div className="mt-3 flex gap-3"><form action={updateSupplierCartItemAction}><input type="hidden" name="itemId" value={item.id}/><input className="h-11 w-20 rounded-lg border px-2" name="quantity" type="number" min="1" defaultValue={item.quantity}/><button className="ml-2 text-sm underline">Update</button></form><form action={removeSupplierCartItemAction}><input type="hidden" name="itemId" value={item.id}/><button className="min-h-11 text-sm text-red-700 underline">Remove</button></form></div></div></article> })}
        </section>
        <aside className="h-fit rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-6 lg:sticky lg:top-36"><h2 className="text-xl font-semibold">Cart summary</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt>Products</dt><dd>{formatZar(productTotal)}</dd></div><div className="flex justify-between"><dt>Delivery</dt><dd className={delivery.gt(0)?"font-semibold":"font-semibold text-emerald-700"}>{delivery.gt(0)?formatZar(delivery):"FREE"}</dd></div><div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold"><dt>Total</dt><dd>{formatZar(orderTotal)}</dd></div></dl>{delivery.gt(0)?<p className="mt-3 rounded-lg bg-white p-3 text-xs leading-5 text-slate-600">Add {formatZar(FREE_DELIVERY_THRESHOLD.minus(productTotal))} for free delivery.</p>:<p className="mt-3 text-xs font-semibold text-emerald-700">Free delivery</p>}<Link className="mt-6 block min-h-12 rounded-md bg-sky-700 px-5 py-3 text-center font-semibold text-white" href="/checkout">Proceed to checkout</Link><Link className="mt-3 block py-3 text-center text-sm text-slate-600 underline" href="/shop">Continue shopping</Link></aside>
      </div>}
    {items.length||supplierItems.length?<div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_18px_rgba(15,23,42,.08)] backdrop-blur sm:hidden"><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><p className="text-xs text-slate-500">Total</p><strong>{formatZar(orderTotal)}</strong></div><Link className="inline-flex min-h-11 items-center rounded-lg bg-sky-700 px-5 text-sm font-bold text-white" href="/checkout">Checkout</Link></div></div>:null}
  </main>;
}
