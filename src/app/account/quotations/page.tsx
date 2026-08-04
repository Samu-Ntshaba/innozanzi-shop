import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/domain/auth/session";
import { startQuotationPaystackPayment, submitPaymentProof } from "@/domain/payments/actions";
import { decideFinalQuotation } from "@/domain/quotations/customer-actions";
import { formatZar } from "@/lib/money";

const input="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3";

export default async function CustomerQuotations({searchParams}:{searchParams:Promise<{submitted?:string;payment?:string;online?:string}>}){
  const ctx=await requireUser();const params=await searchParams;
  const quotes=await prisma.quotation.findMany({where:{customerId:ctx.user.id},include:{items:true,paymentSubmissions:{orderBy:{submittedAt:"desc"},take:1}},orderBy:{createdAt:"desc"}});
  const notice=params.online==="paid"?"Your Paystack payment was verified. Your order is now active.":params.online==="verification-failed"?"We could not verify the returned payment. If funds were deducted, the secure webhook will still update your order.":params.payment?"Proof received. Payment verification is pending.":params.submitted?`Quotation request ${params.submitted} was submitted.`:null;
  return <main className="mx-auto max-w-6xl px-4 py-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">Your quotations</h1><p className="mt-1 text-sm text-slate-600">Review quotes, decisions and payment progress.</p></div><Link className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white" href="/shop">Start another request</Link></div>
    {notice?<p className={`mt-4 rounded-lg px-4 py-3 text-sm ${params.online==="verification-failed"?"bg-amber-50 text-amber-900":"bg-emerald-50 text-emerald-800"}`}>{notice}</p>:null}
    <div className="mt-5 space-y-3">{quotes.map(q=>{
      const canDecide=q.kind==="FINAL"&&q.status==="SENT"&&q.validUntil>new Date();
      const accepted=q.acceptedVersion===q.version&&q.acceptedAmount?.equals(q.grandTotal);
      const canPay=q.kind==="FINAL"&&q.status==="ACCEPTED"&&accepted&&q.validUntil>new Date();
      const canUpload=q.kind==="FINAL"&&["ACCEPTED","PAYMENT_REJECTED"].includes(q.status)&&accepted&&q.validUntil>new Date()&&!q.convertedOrderId;
      const needsAction=canDecide||canPay||canUpload||q.status==="PAYMENT_REJECTED";
      return <article className={`overflow-hidden rounded-xl border bg-white shadow-sm ${needsAction?"border-sky-300":"border-slate-200"}`} key={q.id}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-bold text-slate-950">{q.quotationNumber}</h2><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700">{q.status.replaceAll("_"," ")}</span><span className="text-xs text-slate-500">v{q.version}</span></div><p className="mt-1 text-xs text-slate-500">{q.kind.charAt(0)+q.kind.slice(1).toLowerCase()} · expires {q.validUntil.toLocaleDateString("en-ZA")} · {q.items.length} item{q.items.length===1?"":"s"}</p></div>
          <p className="text-lg font-black text-slate-950">{formatZar(q.grandTotal.toString())}</p>
          <div className="flex items-center gap-3"><Link className="text-sm font-bold text-sky-700 underline" href={`/api/quotations/${q.quotationNumber}/pdf`} target="_blank">PDF</Link>{q.convertedOrderId?<Link className="text-sm font-bold text-sky-700 underline" href="/account/orders">Track order</Link>:null}</div>
        </div>
        {canDecide?<div className="flex flex-wrap items-center justify-between gap-3 border-t bg-sky-50 px-4 py-3 sm:px-5"><p className="text-sm font-medium text-sky-950">Review the final PDF, then record your decision.</p><div className="flex gap-2"><form action={decideFinalQuotation}><input name="id" type="hidden" value={q.id}/><input name="decision" type="hidden" value="ACCEPTED"/><button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Accept quote</button></form><form action={decideFinalQuotation}><input name="id" type="hidden" value={q.id}/><input name="decision" type="hidden" value="REJECTED"/><button className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700">Reject</button></form></div></div>:null}
        {canPay?<div className="flex flex-wrap items-center justify-between gap-3 border-t bg-emerald-50 px-4 py-3 sm:px-5"><p className="text-sm font-medium text-emerald-950">Accepted · choose a payment method.</p><form action={startQuotationPaystackPayment}><input name="quotationId" type="hidden" value={q.id}/><button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Pay securely online</button></form></div>:null}
        <details className="border-t group">
          <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 sm:px-5"><span className="group-open:hidden">Show products and details</span><span className="hidden group-open:inline">Hide products and details</span></summary>
          <div className="border-t bg-slate-50/60 px-4 py-3 sm:px-5"><div className="divide-y rounded-lg border bg-white">{q.items.map(i=><div className="flex justify-between gap-4 px-3 py-2.5 text-sm" key={i.id}><span className="min-w-0 truncate">{i.productName} × {i.quantity}</span><strong className="shrink-0">{formatZar(i.lineTotal.toString())}</strong></div>)}</div>
          {q.kind==="PROVISIONAL"?<p className="mt-3 text-xs text-amber-800">Provisional only — wait for the approved final quotation before paying.</p>:null}
          {canUpload?<details className="mt-3 rounded-lg border bg-white p-3"><summary className="cursor-pointer text-sm font-bold">Pay by EFT and upload proof</summary><form action={submitPaymentProof} className="mt-3 grid gap-3 sm:grid-cols-2"><input type="hidden" name="quotationId" value={q.id}/><label className="text-sm">Amount paid<input className={input} name="amount" type="number" min="0.01" step="0.01" defaultValue={q.grandTotal.toString()} required/></label><label className="text-sm">Payment date<input className={input} name="paymentDate" type="date" required/></label><label className="text-sm">Payment reference<input className={input} name="paymentReference" defaultValue={q.paymentReference??q.quotationNumber} required/></label><label className="text-sm">Proof document<input className={`${input} py-2`} name="proof" type="file" accept=".pdf,image/jpeg,image/png,image/webp" required/></label><label className="text-sm sm:col-span-2">Optional note<textarea className={`${input} min-h-20 py-2`} name="customerNote"/></label><button className="rounded-lg bg-[#071b33] px-5 py-3 text-sm font-bold text-white sm:col-span-2">Submit proof for verification</button></form></details>:null}
          {q.paymentSubmissions[0]?<p className="mt-3 text-xs"><strong>Latest payment:</strong> {q.paymentSubmissions[0].status.replaceAll("_"," ")}{q.paymentSubmissions[0].rejectionReason?` — ${q.paymentSubmissions[0].rejectionReason}`:""}</p>:null}</div>
        </details>
      </article>})}{!quotes.length?<p className="rounded-xl border border-dashed p-10 text-center text-slate-500">No quotation requests yet.</p>:null}</div>
  </main>;
}
