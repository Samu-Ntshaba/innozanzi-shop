import Image from "next/image";
import Link from "next/link";
import { removeCartItemAction, updateCartItemAction } from "@/domain/cart/actions";
import { activeUnitPrice, calculateCart } from "@/domain/cart/calculations";
import { getCurrentCart } from "@/domain/cart/service";
import { formatZar } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function CartPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  const params = await searchParams;
  const cart = await getCurrentCart();
  const items = cart?.items ?? [];
  const totals = calculateCart(items);
  return <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
    <h1 className="text-3xl font-bold sm:text-4xl">Your cart</h1>
    {params.error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">That quantity is unavailable. Stock is checked before checkout.</p>}
    {params.status === "added" && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Product added to your cart.</p>}
    {items.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 px-4 py-16 text-center"><h2 className="text-xl font-semibold">Your cart is empty</h2><Link className="mt-5 inline-block rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white" href="/shop">Browse products</Link></div> : <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 space-y-4">{items.map((item) => {
        const image = item.product.images[0];
        const price = activeUnitPrice(item.product, item.variant);
        return <article key={item.id} className="grid min-w-0 grid-cols-[80px_minmax(0,1fr)] gap-3 rounded-2xl border border-zinc-200 p-3 min-[420px]:grid-cols-[96px_minmax(0,1fr)] min-[420px]:gap-4 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:p-4">
          <div className="relative aspect-square rounded-xl bg-zinc-100">{image && <Image src={image.path} alt={item.product.name} fill sizes="112px" className="object-contain p-2 sm:p-3" />}</div>
          <div className="min-w-0"><Link className="line-clamp-2 font-semibold hover:text-sky-700" href={`/products/${item.product.slug}`}>{item.product.name}</Link>{item.variant && <p className="mt-1 text-sm text-zinc-600">{item.variant.name}</p>}<p className="mt-2 font-bold">{formatZar(price.toString())}</p><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2"><form action={updateCartItemAction} className="flex items-center gap-2"><input type="hidden" name="itemId" value={item.id} /><input aria-label="Quantity" className="h-11 w-16 rounded-lg border border-zinc-300 px-2 text-base" name="quantity" type="number" min={1} max={99} defaultValue={item.quantity} /><button className="min-h-11 text-sm underline" type="submit">Update</button></form><form action={removeCartItemAction}><input type="hidden" name="itemId" value={item.id} /><button className="min-h-11 text-sm text-red-700 underline" type="submit">Remove</button></form></div></div>
          <p className="col-span-2 font-bold sm:col-span-1 sm:text-right">{formatZar(price.mul(item.quantity).toString())}</p>
        </article>;
      })}</section>
      <aside className="h-fit rounded-2xl bg-zinc-950 p-5 text-white sm:p-6"><h2 className="text-xl font-bold">Order summary</h2><dl className="mt-6 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt>Subtotal excluding VAT</dt><dd className="shrink-0">{formatZar(totals.net.toString())}</dd></div><div className="flex justify-between gap-4"><dt>VAT (15%)</dt><dd className="shrink-0">{formatZar(totals.vat.toString())}</dd></div><div className="flex justify-between gap-4 border-t border-zinc-700 pt-4 text-lg font-bold"><dt>Total</dt><dd className="shrink-0">{formatZar(totals.gross.toString())}</dd></div></dl><p className="mt-3 text-xs text-zinc-400">Delivery is calculated at checkout.</p><Link className="mt-6 block min-h-12 rounded-lg bg-amber-500 px-5 py-3 text-center font-semibold text-zinc-950" href="/checkout">Proceed to checkout</Link><Link className="mt-3 block min-h-11 py-3 text-center text-sm text-zinc-300 underline" href="/shop">Continue shopping</Link></aside>
    </div>}
  </main>;
}
