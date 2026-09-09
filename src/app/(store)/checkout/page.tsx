import { gatewayConfigured } from "@/integrations/payments/approved-gateways";
import { checkoutQuote } from "@/domain/commerce/checkout";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, LockKeyhole, MapPin } from "lucide-react";
import { PaymentMethodSelector } from "@/components/store/payment-method-selector";
import { requireUser } from "@/domain/auth/session";
import { getCurrentCart } from "@/domain/cart/service";
import { CheckoutForm } from "@/components/store/checkout-form";
import { DeliveryAddressFields } from "@/components/store/delivery-address-fields";
import { listAddresses } from "@/domain/addresses/service";
import { mapsConfigured } from "@/domain/addresses/google-places";
import { formatZar } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getDeliveryProvinces } from "@/domain/addresses/delivery-areas";
import { CouponEntry } from "@/components/store/coupon-entry";

export const dynamic = "force-dynamic";
const input = "mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-700 focus:ring-2 focus:ring-sky-700/15";
const label = "text-sm font-semibold text-slate-800";

export default async function CheckoutPage({searchParams}:{searchParams:Promise<{coupon?:string}>}) {
  const user = await requireUser();
  const [profile, addresses, supportedProvinces] = await Promise.all([
    prisma.user.findUnique({where:{id:user.user.id},select:{phone:true}}),
    listAddresses(user.user.id),
    getDeliveryProvinces(),
  ]);
  const cart = await getCurrentCart();
  if (!cart || (!cart.items.length && !cart.supplierItems.length)) redirect("/cart");
  const couponCode=(await searchParams).coupon?.trim().slice(0,40)??"";
  let quote;let quoteError="";
  try {quote=await checkoutQuote(cart,user.user.id,couponCode);}catch(error){quoteError=error instanceof Error?error.message:"Your basket needs a review.";}
  if(!quote)return <main className="mx-auto max-w-xl px-4 py-12"><h1 className="text-2xl font-bold">Please review your basket</h1><p className="my-4">{quoteError}</p><Link href="/checkout" className="text-sky-700 underline">Remove coupon and review</Link> · <Link href="/cart" className="text-sky-700 underline">Return to cart</Link></main>;
  const {lines,subtotal,vat,delivery,total}=quote;
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  return <main className="min-h-screen bg-slate-50 pb-16">
    <div className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8"><div><Link className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-sky-700" href="/cart"><ChevronLeft className="size-4"/>Return to cart</Link><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Secure checkout</h1></div><div className="hidden items-center gap-2 text-sm font-semibold text-emerald-700 sm:flex"><LockKeyhole className="size-5"/>Encrypted checkout</div></div></div>
    <CheckoutForm className="mx-auto grid max-w-7xl items-start gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
      <input type="hidden" name="priceFingerprint" value={quote.fingerprint}/><input type="hidden" name="couponCode" value={couponCode}/>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3 border-b border-slate-200 pb-5"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-800"><MapPin className="size-5"/></span><div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Step 1</p><h2 className="text-xl font-bold text-slate-950">Delivery address</h2><p className="mt-1 text-sm text-slate-500">Where should we deliver your order?</p></div></div>
          <DeliveryAddressFields addresses={addresses} mapsEnabled={mapsConfigured()} name={user.user.name ?? ""} phone={profile?.phone ?? ""} supportedProvinces={supportedProvinces}/>
          {addresses.length < 20 ? <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" name="saveAddress"/> Save a new address to my account for next time</label> : <p className="mt-4 text-sm text-slate-600">Your address book is full. <Link href="/account/addresses" className="underline">Remove an old address</Link> to save another. You can still use a new address for this order.</p>}
          <label className={`${label} mt-5 block`}>Delivery notes (optional)<textarea className={`${input} h-auto min-h-24 py-3`} name="notes" maxLength={1000} placeholder="Access instructions for the delivery team"/></label>
        </section>
      </div>
      <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-28">
        <div className="border-b border-slate-200 p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-slate-950">Order summary</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{itemCount} {itemCount === 1 ? "item" : "items"}</span></div><div className="mt-5 max-h-64 space-y-4 overflow-auto pr-1">{lines.map(line => <div className="flex justify-between gap-4 text-sm" key={`${line.sourceType}-${line.sourceId}`}><div className="min-w-0"><p className="line-clamp-2 font-semibold leading-5 text-slate-800">{line.productName}</p><p className="mt-1 text-xs text-slate-500">Quantity {line.quantity}</p></div><span className="shrink-0 font-semibold text-slate-900">{formatZar(line.grossUnit.mul(line.quantity))}</span></div>)}</div></div>
        <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-6"><dl className="space-y-3 text-sm"><div className="flex justify-between text-slate-600"><dt>Subtotal</dt><dd>{formatZar(subtotal)}</dd></div>{vat.gt(0) ? <div className="flex justify-between text-slate-600"><dt>VAT</dt><dd>{formatZar(vat)}</dd></div> : null}<div className="flex justify-between text-slate-600"><dt>Delivery</dt><dd className={delivery.gt(0)?"font-semibold text-slate-900":"font-semibold text-emerald-700"}>{delivery.gt(0)?formatZar(delivery):"FREE"}</dd></div>{delivery.gt(0)?<p className="rounded-lg bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">Delivery is included in the confirmed order total.</p>:<p className="text-xs font-semibold text-emerald-700">You qualify for free delivery.</p>}<div className="flex items-end justify-between border-t border-slate-200 pt-4"><dt className="text-base font-bold text-slate-950">Order total</dt><dd className="text-2xl font-black tracking-tight text-slate-950">{formatZar(total)}</dd></div></dl></div>
        <CouponEntry code={couponCode} saving={quote.coupon ? quote.coupon.code + ": saving " + formatZar(quote.coupon.discount) : undefined}/>
        <PaymentMethodSelector total={formatZar(total)} available={{OZOW:gatewayConfigured("OZOW"),PAYFAST:gatewayConfigured("PAYFAST")}}/>
      </aside>
    </CheckoutForm>
  </main>;
}
