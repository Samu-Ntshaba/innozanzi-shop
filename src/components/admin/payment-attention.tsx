import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatZar } from "@/lib/money";

export async function PaymentAttention({compact=false}:{compact?:boolean}){
  const now=new Date();
  const payments=await prisma.payment.findMany({where:{provider:{in:["PAYFAST","OZOW"]},OR:[{status:"PENDING",createdAt:{lte:new Date(now.getTime()-90_000)}},{status:"PAID",order:{paymentStatus:"PENDING"}},{failureReason:{startsWith:"Payment captured"}}]},include:{order:{select:{id:true,orderNumber:true,email:true,paymentStatus:true,status:true}}},orderBy:{createdAt:"desc"},take:compact?6:50});
  const records=compact?[]:await prisma.auditLog.findMany({where:{entityType:"Payment",entityId:{in:payments.map(p=>p.id)},action:{startsWith:"payment."}},orderBy:{createdAt:"desc"},take:1000});
  return <section className="my-5 space-y-3"><h2 className="text-lg font-black">Payments needing attention</h2><p className="text-sm text-slate-600">Delayed confirmation is not a failed payment. Unresolved attempts remain visible until verified or reviewed.</p>
    {payments.map(payment=>{
      const events=records.filter(record=>record.entityId===payment.id);
      const mismatch=payment.status==="PAID"&&payment.order.paymentStatus==="PENDING";
      return <article key={payment.id} className="min-w-0 rounded-xl border border-amber-200 bg-white p-4">
        <Link className="font-bold text-sky-800 underline" href={`/admin/orders/${payment.orderId}`}>{payment.order.orderNumber}</Link>
        <p className="mt-1 text-sm">{payment.provider} · {formatZar(payment.amount.toString())} · {Math.max(0,Math.floor((now.getTime()-payment.createdAt.getTime())/60_000))} minutes old</p>
        <p className="mt-1 font-semibold text-amber-900">{mismatch?"Gateway/order mismatch":payment.status==="PAID"?"Captured payment requires finance review":"Confirmation delayed — reconciliation required"}</p>
        {!compact?<><dl className="mt-3 grid gap-2 break-words text-sm sm:grid-cols-2"><div><dt className="font-semibold">Customer</dt><dd>{payment.order.email}</dd></div><div><dt className="font-semibold">Payment attempt / merchant reference</dt><dd className="break-all">{payment.id}<br/>{payment.externalReference??"Not submitted"}</dd></div><div><dt className="font-semibold">Created (UTC)</dt><dd>{payment.createdAt.toISOString()}</dd></div><div><dt className="font-semibold">Internal states</dt><dd>Payment: {payment.status}<br/>Order payment: {payment.order.paymentStatus}<br/>Order: {payment.order.status}</dd></div></dl>
          <p className="mt-3 text-sm">Next action: {payment.provider==="PAYFAST"?"Review PayFast transaction history and request a signed ITN resend; use verified evidence in the reconciliation form below.":"The server queries Ozow by reference. Use the provider transaction ID below if this remains unresolved."}</p>
          <details className="mt-3 text-sm"><summary className="cursor-pointer font-bold">Recent payment evidence and checks ({events.length})</summary>{events.length?events.slice(0,15).map(event=>{const metadata=event.metadata&&typeof event.metadata==="object"&&!Array.isArray(event.metadata)?event.metadata:{};return <div key={event.id} className="mt-2 break-all border-t pt-2"><p>{event.createdAt.toISOString()} · {event.action}</p>{["result","verified","reason","providerTransactionId","httpStatus","correlationId","jobId"].map(key=>metadata[key]!=null?<p key={key}>{key}: {String(metadata[key])}</p>:null)}</div>}):<p className="mt-2">No diagnostic events recorded. Historical browser returns and rejected callbacks were not retained; absence of a record does not prove no callback arrived.</p>}</details>
        </>:<Link className="mt-2 inline-block text-sm font-bold text-sky-800 underline" href="/admin/payments">Open payment reconciliation</Link>}
      </article>;
    })}
    {!payments.length?<p className="rounded-xl bg-white p-4 text-sm">No delayed hosted payments found.</p>:null}
  </section>;
}
