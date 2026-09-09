import Link from "next/link";
import { listAddresses } from "@/domain/addresses/service";
import { mapsConfigured } from "@/domain/addresses/google-places";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/domain/auth/session";
import { startQuotationOnlinePayment } from "@/domain/payments/actions";
import { decideFinalQuotation } from "@/domain/quotations/customer-actions";
import { formatZar } from "@/lib/money";
import { gatewayConfigured } from "@/integrations/payments/approved-gateways";
import { getDeliveryProvinces } from "@/domain/addresses/delivery-areas";
import { eftConfigured, getRetailPaymentSettings } from "@/domain/payments/settings";

const input="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3";

export default async function CustomerQuotations({searchParams}:{searchParams:Promise<{submitted?:string;payment?:string;online?:string;address?:string}>}){
  const ctx=await requireUser();const params=await searchParams;
  const [deliveryProvinces, retailPaymentSettings] = await Promise.all([getDeliveryProvinces(), getRetailPaymentSettings()]);
  const addresses = (await listAddresses(ctx.user.id)).filter(a => (!mapsConfigured() || a.googlePlaceId) && deliveryProvinces.includes(a.province) && /^(?:\+27|0)[6-8]\d{8}$/.test(a.phone.replace(/[\s()-]/g, "")));
  const paymentMethods = { OZOW: gatewayConfigured("OZOW"), EFT: eftConfigured(retailPaymentSettings) };
  const addressChoice = <label className="block text-sm font-semibold">Delivery address<select className={input} name="addressId" defaultValue={addresses[0]?.id ?? ""} required><option value="" disabled>Choose a saved delivery address</option>{addresses.map(a => <option key={a.id} value={a.id}>{a.line1}, {a.city}{a.isDefault ? " (default)" : ""}</option>)}</select><Link href="/account/addresses" className="mt-2 inline-block font-normal text-sky-700 underline">Add or manage addresses</Link></label>;
  const quotes=await prisma.quotation.findMany({where:{customerId:ctx.user.id},include:{items:true,paymentSubmissions:{orderBy:{submittedAt:"desc"},take:1}},orderBy:{createdAt:"desc"}});
  const notice=params.address ? "Please add a complete delivery address to your account, then select it before payment." : params.online==="paid"?"Your payment was verified. Your order is now active.":params.online==="verification-failed"?"We could not verify the returned payment. If funds were deducted, the secure webhook will still update your order.":params.payment?"Proof received. Payment verification is pending.":params.submitted?`Quotation request ${params.submitted} was submitted.`:null;
  return <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
    <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h1 className="text-3xl font-black">Your quotations</h1><p className="mt-1 text-sm text-slate-600">Review quotes, decisions and payment progress.</p></div><Link className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-center text-sm font-bold text-white sm:w-auto" href="/shop">Start another request</Link></div>
    {notice?<p className={`mt-4 rounded-lg px-4 py-3 text-sm ${params.online==="verification-failed"?"bg-amber-50 text-amber-900":"bg-emerald-50 text-emerald-800"}`}>{notice}</p>:null}
    <div className="mt-5 space-y-3">{quotes.map(q=>{
      const canDecide=q.kind==="FINAL"&&q.status==="SENT"&&q.validUntil>new Date();
      const accepted=q.acceptedVersion===q.version&&q.acceptedAmount?.equals(q.grandTotal);
      const canPay=q.kind==="FINAL"&&q.status==="ACCEPTED"&&accepted&&q.validUntil>new Date();
      const canUpload=q.kind==="FINAL"&&["ACCEPTED","PAYMENT_REJECTED"].includes(q.status)&&accepted&&q.validUntil>new Date()&&!q.convertedOrderId;
      const needsAction=canDecide||canPay||canUpload||q.status==="PAYMENT_REJECTED";
      return <article className={`overflow-hidden rounded-xl border bg-white shadow-sm ${needsAction?"border-sky-300":"border-slate-200"}`} key={q.id}>
        <div className="flex min-w-0 flex-col items-start gap-x-5 gap-y-2 px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:px-5">
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-bold text-slate-950">{q.quotationNumber}</h2><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700">{q.status.replaceAll("_"," ")}</span><span className="text-xs text-slate-500">v{q.version}</span></div><p className="mt-1 text-xs text-slate-500">{q.kind.charAt(0)+q.kind.slice(1).toLowerCase()} · expires {q.validUntil.toLocaleDateString("en-ZA")} · {q.items.length} item{q.items.length===1?"":"s"}</p></div>
          <p className="text-lg font-black text-slate-950">{formatZar(q.grandTotal.toString())}</p>
          <div className="flex items-center gap-3"><Link className="text-sm font-bold text-sky-700 underline" href={`/api/quotations/${q.quotationNumber}/pdf`} target="_blank">PDF</Link>{q.convertedOrderId?<Link className="text-sm font-bold text-sky-700 underline" href="/account/orders">Track order</Link>:null}</div>
        </div>
        {canDecide?<div className="flex min-w-0 flex-col items-stretch gap-3 border-t bg-sky-50 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5"><p className="text-sm font-medium text-sky-950">Review the final PDF, then record your decision.</p><div className="grid grid-cols-2 gap-2 sm:flex"><form action={decideFinalQuotation}><input name="id" type="hidden" value={q.id}/><input name="decision" type="hidden" value="ACCEPTED"/><button className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Accept quote</button></form><form action={decideFinalQuotation}><input name="id" type="hidden" value={q.id}/><input name="decision" type="hidden" value="REJECTED"/><button className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700">Reject</button></form></div></div>:null}
        {canPay?<div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t bg-emerald-50 px-4 py-3 sm:px-5"><p className="text-sm font-medium text-emerald-950">Accepted · choose a payment method.</p>{paymentMethods.OZOW || paymentMethods.EFT ? <form action={startQuotationOnlinePayment} className="min-w-0 w-full space-y-3">{addressChoice}<select name="paymentMethod" className={input}>{paymentMethods.OZOW ? <option value="OZOW">Ozow instant bank payment</option> : null}{paymentMethods.EFT ? <option value="EFT">Manual EFT and proof upload</option> : null}</select><input name="quotationId" type="hidden" value={q.id}/><button className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white sm:w-auto sm:py-2">Continue to payment</button></form> : <p className="w-full text-sm text-amber-900">Payment is temporarily unavailable. Please contact support.</p>}</div>:null}
        <details className="border-t group">
          <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 sm:px-5"><span className="group-open:hidden">Show products and details</span><span className="hidden group-open:inline">Hide products and details</span></summary>
          <div className="border-t bg-slate-50/60 px-4 py-3 sm:px-5"><div className="divide-y rounded-lg border bg-white">{q.items.map(i=><div className="grid min-w-0 gap-1 px-3 py-2.5 text-sm min-[420px]:grid-cols-[minmax(0,1fr)_auto] min-[420px]:gap-4" key={i.id}><span className="min-w-0 break-words">{i.productName} × {i.quantity}</span><strong>{formatZar(i.lineTotal.toString())}</strong></div>)}</div>
          {q.kind==="PROVISIONAL"?<p className="mt-3 text-xs text-amber-800">Provisional only — wait for the approved final quotation before paying.</p>:null}
          {q.paymentSubmissions[0]?<p className="mt-3 text-xs"><strong>Latest payment:</strong> {q.paymentSubmissions[0].status.replaceAll("_"," ")}{q.paymentSubmissions[0].rejectionReason?` — ${q.paymentSubmissions[0].rejectionReason}`:""}</p>:null}</div>
        </details>
      </article>})}{!quotes.length?<p className="rounded-xl border border-dashed p-10 text-center text-slate-500">No quotation requests yet.</p>:null}</div>
  </main>;
}
