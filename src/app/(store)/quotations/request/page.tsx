import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/domain/auth/session";
import { getCurrentCart } from "@/domain/cart/service";
import { submitUnifiedCartQuotationRequest } from "@/domain/quotations/cart-quotation-actions";

export const metadata:Metadata={title:"Request a quotation",robots:{index:false,follow:false}};
const input="mt-1 min-h-12 w-full rounded-lg border border-slate-300 px-3";

export default async function Page(){
  const{user}=await requireUser();const cart=await getCurrentCart();const manual=cart?.items??[],supplier=cart?.supplierItems??[];const count=manual.length+supplier.length;
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Quotation request</p><h1 className="mt-1 text-3xl font-black">Confirm your request</h1><p className="mt-2 text-sm text-slate-600">We will email a priced provisional quotation, then our team will review the final offer.</p></div><Link className="shrink-0 text-sm font-bold text-sky-700 underline" href="/cart">Edit products</Link></div>
    {!count?<div className="mt-6 rounded-xl border border-dashed p-8 text-center"><p className="font-semibold">Your quotation list is empty.</p><Link className="mt-4 inline-block rounded-lg bg-sky-700 px-5 py-3 font-bold text-white" href="/shop">Browse products</Link></div>:<form action={submitUnifiedCartQuotationRequest} className="mt-6 space-y-4"><section className="flex items-center justify-between rounded-xl border bg-white px-4 py-3"><div><p className="font-bold">{count} selected item{count===1?"":"s"}</p><p className="text-xs text-slate-500">Quantities and availability will be checked again.</p></div><Link className="text-sm font-bold text-sky-700" href="/cart">Review</Link></section>
      <section className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2"><label className="text-sm font-semibold">Contact name<input className={input} name="contactName" defaultValue={user.name??""} required/></label><label className="text-sm font-semibold">Email<input className={`${input} bg-slate-50`} value={user.email} readOnly/></label><label className="text-sm font-semibold">Phone <span className="font-normal text-slate-500">(optional)</span><input className={input} name="phone" type="tel"/></label><label className="text-sm font-semibold">Company <span className="font-normal text-slate-500">(optional)</span><input className={input} name="companyName"/></label><label className="text-sm font-semibold">Delivery<select className={input} name="deliveryRequired" defaultValue="yes"><option value="yes">Delivery required</option><option value="no">Collection / decide later</option></select></label><label className="text-sm font-semibold sm:col-span-2">Anything we should know? <span className="font-normal text-slate-500">(optional)</span><textarea className={`${input} min-h-24 py-3`} name="customerNotes" placeholder="Specifications, deadline or delivery area"/></label></section>
      <button className="min-h-12 w-full rounded-lg bg-[#071b33] px-5 py-3 font-bold text-white">Request priced quotation</button><p className="text-center text-xs text-slate-500">No payment is taken now. Do not pay until you receive and accept the final quotation.</p>
    </form>}
  </main>;
}
