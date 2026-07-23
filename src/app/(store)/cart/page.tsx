import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { removeCartItemAction, updateCartItemAction } from "@/domain/cart/actions";
import { getCurrentCart } from "@/domain/cart/service";

export const metadata: Metadata = { title: "Your quotation list", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CartPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  const params = await searchParams;
  const cart = await getCurrentCart();
  const items = cart?.items ?? [];

  return <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
    <h1 className="text-3xl font-bold sm:text-4xl">Your quotation list</h1>
    <p className="mt-2 text-slate-600">Review requested products and quantities. Prices are prepared only after you submit the request.</p>
    {params.error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">That requested quantity is unavailable.</p>}
    {params.status === "added" && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Product added to your quotation list.</p>}
    {!items.length
      ? <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 px-4 py-16 text-center"><h2 className="text-xl font-semibold">Your quotation list is empty</h2><Link className="mt-5 inline-block rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white" href="/shop">Browse products</Link></div>
      : <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">{items.map((item) => {
          const image = item.product.images[0];
          const inventory = item.variant?.inventory ?? item.product.inventory[0];
          const available = inventory ? Math.max(0, inventory.onHand - inventory.reserved) : 0;
          return <article key={item.id} className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 rounded-2xl border p-3 sm:grid-cols-[112px_minmax(0,1fr)_auto]">
            <div className="relative aspect-square rounded-xl bg-zinc-100">{image && <Image src={image.path} alt={item.product.name} fill sizes="112px" className="object-contain p-2" />}</div>
            <div>
              <Link className="font-semibold hover:text-sky-700" href={`/products/${item.product.slug}`}>{item.product.name}</Link>
              <p className="mt-1 text-sm text-zinc-600">{item.variant?.name ?? item.product.sku} · {available} available</p>
              <p className="mt-2 text-sm font-semibold text-sky-700">Price will be confirmed in your quotation.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <form action={updateCartItemAction} className="flex items-center gap-2"><input type="hidden" name="itemId" value={item.id} /><input aria-label="Requested quantity" className="h-11 w-20 rounded-lg border px-2" name="quantity" type="number" min={1} max={available} defaultValue={item.quantity} /><button className="min-h-11 text-sm underline">Update quantity</button></form>
                <form action={removeCartItemAction}><input type="hidden" name="itemId" value={item.id} /><button className="min-h-11 text-sm text-red-700 underline">Remove</button></form>
              </div>
            </div>
            <p className="col-span-2 font-bold sm:col-span-1 sm:text-right">Requested: {item.quantity}</p>
          </article>;
        })}</section>
        <aside className="h-fit rounded-2xl bg-zinc-950 p-6 text-white">
          <h2 className="text-xl font-bold">Request your tailored price</h2>
          <p className="mt-4 text-sm leading-6 text-zinc-300">Submit your quantities and delivery requirements. We will prepare the pricing, VAT, delivery and commercial terms in your quotation.</p>
          <p className="mt-3 text-xs text-zinc-400">No payment is collected and no stock is reserved at this stage.</p>
          <Link className="mt-6 block min-h-12 rounded-lg bg-amber-500 px-5 py-3 text-center font-semibold text-zinc-950" href="/quotations/request">Continue quotation request</Link>
          <Link className="mt-3 block py-3 text-center text-sm text-zinc-300 underline" href="/shop">Add more products</Link>
        </aside>
      </div>}
  </main>;
}
