import Decimal from "decimal.js";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, LockKeyhole, MapPin, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { PaymentMethodSelector } from "@/components/store/payment-method-selector";
import { requireUser } from "@/domain/auth/session";
import { getCurrentCart } from "@/domain/cart/service";
import { resolveQuotationCart } from "@/domain/catalogue/product-source";
import { placeRetailOrder } from "@/domain/checkout/actions";
import { deliveryFee, FREE_DELIVERY_THRESHOLD } from "@/domain/checkout/delivery";
import { formatZar } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const input = "mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-700 focus:ring-2 focus:ring-sky-700/15";
const label = "text-sm font-semibold text-slate-800";
const provinces = ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"];

export default async function CheckoutPage() {
  const user = await requireUser();
  const profile=await prisma.user.findUnique({where:{id:user.user.id},select:{phone:true}});
  const cart = await getCurrentCart();
  if (!cart || (!cart.items.length && !cart.supplierItems.length)) redirect("/cart");
  const lines = await resolveQuotationCart(cart, new Decimal(5));
  const subtotal = lines.reduce((sum, line) => sum.plus(line.netUnit.mul(line.quantity)), new Decimal(0));
  const vat = lines.reduce((sum, line) => sum.plus(line.vatUnit.mul(line.quantity)), new Decimal(0));
  const productTotal = subtotal.plus(vat);
  const delivery = deliveryFee(productTotal);
  const total = productTotal.plus(delivery);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  return <main className="min-h-screen bg-slate-50 pb-16">
    <div className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8"><div><Link className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-sky-700" href="/cart"><ChevronLeft className="size-4"/>Return to cart</Link><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Secure checkout</h1></div><div className="hidden items-center gap-2 text-sm font-semibold text-emerald-700 sm:flex"><LockKeyhole className="size-5"/>Encrypted checkout</div></div></div>
    <form action={placeRetailOrder} className="mx-auto grid max-w-7xl items-start gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3 border-b border-slate-200 pb-5"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-800"><MapPin className="size-5"/></span><div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Step 1</p><h2 className="text-xl font-bold text-slate-950">Delivery address</h2><p className="mt-1 text-sm text-slate-500">Where should we deliver your order?</p></div></div>
          <div className="mt-6 grid gap-x-5 gap-y-5 sm:grid-cols-2">
            <label className={`${label} sm:col-span-2`}>Recipient name<input className={input} name="recipient" autoComplete="name" defaultValue={user.user.name ?? ""} required/></label>
            <label className={label}>Phone number<input className={input} name="phone" type="tel" autoComplete="tel" placeholder="e.g. 071 234 5678" defaultValue={profile?.phone??""} required/></label>
            <label className={label}>Street address<input className={input} name="line1" autoComplete="address-line1" placeholder="Street number and name" required/></label>
            <label className={label}>Address line 2 <span className="font-normal text-slate-400">(optional)</span><input className={input} name="line2" autoComplete="address-line2" placeholder="Complex, unit or building"/></label>
            <label className={label}>Suburb <span className="font-normal text-slate-400">(optional)</span><input className={input} name="suburb" autoComplete="address-level3"/></label>
            <label className={label}>City<input className={input} name="city" autoComplete="address-level2" required/></label>
            <label className={label}>Province<select className={input} name="province" autoComplete="address-level1" defaultValue="Gauteng" required>{provinces.map(province => <option key={province}>{province}</option>)}</select></label>
            <label className={label}>Postal code<input className={input} name="postalCode" autoComplete="postal-code" inputMode="numeric" required/></label>
            <label className={`${label} sm:col-span-2`}>Delivery notes <span className="font-normal text-slate-400">(optional)</span><textarea className={`${input} h-auto min-h-24 py-3`} name="notes" placeholder="Access instructions or anything our delivery team should know"/></label>
          </div>
        </section>
        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm sm:grid-cols-3 sm:p-6"><div className="flex gap-3"><Truck className="size-5 shrink-0 text-sky-700"/><div><strong>Nationwide delivery</strong><p className="mt-1 text-xs leading-5 text-slate-500">Tracked fulfilment across South Africa.</p></div></div><div className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-sky-700"/><div><strong>Secure payment</strong><p className="mt-1 text-xs leading-5 text-slate-500">Payment details are protected.</p></div></div><div className="flex gap-3"><PackageCheck className="size-5 shrink-0 text-sky-700"/><div><strong>Stock rechecked</strong><p className="mt-1 text-xs leading-5 text-slate-500">Availability is confirmed on order.</p></div></div></section>
      </div>
      <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-28">
        <div className="border-b border-slate-200 p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-slate-950">Order summary</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{itemCount} {itemCount === 1 ? "item" : "items"}</span></div><div className="mt-5 max-h-64 space-y-4 overflow-auto pr-1">{lines.map(line => <div className="flex justify-between gap-4 text-sm" key={`${line.sourceType}-${line.sourceId}`}><div className="min-w-0"><p className="line-clamp-2 font-semibold leading-5 text-slate-800">{line.productName}</p><p className="mt-1 text-xs text-slate-500">Quantity {line.quantity}</p></div><span className="shrink-0 font-semibold text-slate-900">{formatZar(line.grossUnit.mul(line.quantity))}</span></div>)}</div></div>
        <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-6"><dl className="space-y-3 text-sm"><div className="flex justify-between text-slate-600"><dt>Subtotal</dt><dd>{formatZar(subtotal)}</dd></div>{vat.gt(0) ? <div className="flex justify-between text-slate-600"><dt>VAT</dt><dd>{formatZar(vat)}</dd></div> : null}<div className="flex justify-between text-slate-600"><dt>Delivery</dt><dd className={delivery.gt(0)?"font-semibold text-slate-900":"font-semibold text-emerald-700"}>{delivery.gt(0)?formatZar(delivery):"FREE"}</dd></div>{delivery.gt(0)?<p className="rounded-lg bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">R100 delivery applies because the product total is below {formatZar(FREE_DELIVERY_THRESHOLD)}.</p>:<p className="text-xs font-semibold text-emerald-700">You qualify for free delivery.</p>}<div className="flex items-end justify-between border-t border-slate-200 pt-4"><dt className="text-base font-bold text-slate-950">Order total</dt><dd className="text-2xl font-black tracking-tight text-slate-950">{formatZar(total)}</dd></div></dl></div>
        <PaymentMethodSelector total={formatZar(total)}/>
      </aside>
    </form>
  </main>;
}
