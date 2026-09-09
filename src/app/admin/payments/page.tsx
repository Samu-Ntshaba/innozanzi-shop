import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  AdminPage,
  Panel,
  StatusBadge,
  buttonClass,
  inputClass,
  tableClass,
} from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { createPaystackRefund, verifyPaymentSubmission } from "@/domain/payments/actions";
import { getRetailPaymentSettings } from "@/domain/payments/settings";
import { saveRetailPaymentSettings } from "@/domain/payments/settings-actions";
import { reviewPaymentProof } from "@/domain/admin/actions";
export default async function Page() {
  await requirePermission("payments.approve");
  const [rows,onlinePayments,retailPaymentSettings,retailProofs] = await Promise.all([prisma.paymentSubmission.findMany({
    include: {
      quotation: { include: { quotationRequest: true } },
      document: true,
      verification: {
        include: { verifiedBy: { select: { name: true, email: true } } },
      },
      order: { select: { id: true, orderNumber: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 100,
  }),prisma.payment.findMany({where:{provider:"PAYSTACK",status:{in:["PAID","PARTIALLY_REFUNDED"]}},include:{order:true},orderBy:{paidAt:"desc"},take:100}),getRetailPaymentSettings(),prisma.paymentProof.findMany({include:{payment:{include:{order:{select:{orderNumber:true,email:true}}}},uploadedBy:{select:{name:true,email:true}}},orderBy:{createdAt:"desc"},take:100})]);
  return (
    <AdminPage
      title="Payment verification"
      description="Proof review controls order activation. Uploading evidence never verifies payment automatically."
    >
      <Panel title="Customer payment methods" description="Ozow is the only live instant-payment gateway. Enable EFT only after verifying the company banking details below. PayFast is unavailable for new customer payments.">
        <form action={saveRetailPaymentSettings} className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-lg border p-3 text-sm font-bold sm:col-span-2"><input type="checkbox" name="eftEnabled" defaultChecked={retailPaymentSettings.eftEnabled}/>Enable EFT at checkout</label>
          <label className="text-sm font-semibold">Bank name<input className={inputClass} name="bankName" defaultValue={retailPaymentSettings.bankName}/></label>
          <label className="text-sm font-semibold">Account holder<input className={inputClass} name="accountHolder" defaultValue={retailPaymentSettings.accountHolder}/></label>
          <label className="text-sm font-semibold">Account number<input className={inputClass} name="accountNumber" defaultValue={retailPaymentSettings.accountNumber}/></label>
          <label className="text-sm font-semibold">Branch code<input className={inputClass} name="branchCode" defaultValue={retailPaymentSettings.branchCode}/></label>
          <label className="text-sm font-semibold">Account type<input className={inputClass} name="accountType" defaultValue={retailPaymentSettings.accountType} placeholder="Cheque, current or savings"/></label>
          <label className="text-sm font-semibold sm:col-span-2">Customer instructions<textarea className={inputClass + " min-h-24"} name="instructions" defaultValue={retailPaymentSettings.instructions} placeholder="Use your order number as the payment reference."/></label>
          <button className={buttonClass + " sm:col-span-2"}>Save customer payment settings</button>
        </form>
      </Panel>
      <Panel title="Retail EFT proof review" description="Confirm funds in the company bank account before approving. An uploaded document is evidence only.">
        <div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Order / customer</th><th>Proof</th><th>Amount</th><th>Status</th><th>Decision</th></tr></thead><tbody>
          {retailProofs.map(proof => <tr key={proof.id}><td><strong>{proof.payment.order.orderNumber}</strong><br/><span className="text-xs text-slate-500">{proof.payment.order.email}</span></td><td><a className="font-semibold text-sky-700 underline" href={"/api/admin/payment-proofs/" + proof.id} target="_blank">{proof.originalName}</a><br/><span className="text-xs text-slate-500">{proof.createdAt.toLocaleString("en-ZA")}</span></td><td>R {proof.payment.amount.toString()}</td><td><StatusBadge value={proof.status}/>{proof.reviewNote ? <p className="mt-1 max-w-xs text-xs">{proof.reviewNote}</p> : null}</td><td>{proof.status === "PENDING" ? <form action={reviewPaymentProof} className="grid min-w-64 gap-2"><input type="hidden" name="id" value={proof.id}/><input className={inputClass} name="note" placeholder="Finance review note"/><div className="flex gap-2"><button name="status" value="APPROVED" className="bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Approve verified funds</button><button name="status" value="REJECTED" className="border border-red-300 px-3 py-2 text-xs font-bold text-red-800">Reject</button></div></form> : <span className="text-xs text-slate-500">Reviewed</span>}</td></tr>)}
          {!retailProofs.length ? <tr><td colSpan={5} className="py-8 text-center text-slate-500">No retail EFT proofs uploaded.</td></tr> : null}
        </tbody></table></div>
      </Panel>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold">Customer refund payment queue</h2><p className="mt-1 text-sm text-slate-600">Approved refunds remain separate from original payments and require finance confirmation before completion.</p></div>
          <Link className="rounded bg-sky-700 px-4 py-2 text-sm font-bold text-white" href="/admin/returns?refund=AWAITING_PAYMENT">Open refund queue</Link>
        </div>
      </Panel>
      <Panel title="Paystack refunds" description="Refunds are sent back through the original Paystack transaction and recorded in the audit log.">
        <div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Order</th><th>Captured payment</th><th>Status</th><th>Create refund</th></tr></thead><tbody>
          {onlinePayments.map(payment=><tr key={payment.id}><td><strong>{payment.order.orderNumber}</strong><br/><span className="text-xs text-slate-500">{payment.order.email}</span></td><td>R {payment.amount.toString()}<br/><span className="text-xs font-mono">{payment.externalReference}</span></td><td><StatusBadge value={payment.status}/></td><td><form action={createPaystackRefund} className="grid min-w-72 gap-2"><input name="paymentId" type="hidden" value={payment.id}/><input className={inputClass} max={payment.amount.toString()} min="0.01" name="amount" placeholder="Refund amount" step="0.01" type="number" required/><input className={inputClass} name="reason" placeholder="Customer-facing refund reason" required/><button className="border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">Create Paystack refund</button></form></td></tr>)}
          {!onlinePayments.length?<tr><td colSpan={4} className="py-8 text-center text-slate-500">No refundable Paystack payments.</td></tr>:null}
        </tbody></table></div>
      </Panel>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold">Transport payment queue</h2><p className="mt-1 text-sm text-slate-600">Approved transport expenses remain separate from logistics completion and require finance confirmation.</p></div>
          <Link className="rounded bg-sky-700 px-4 py-2 text-sm font-bold text-white" href="/admin/logistics">Open logistics payments</Link>
        </div>
      </Panel>
      <Panel className="p-0">
        <table className={tableClass}>
          <thead>
            <tr>
              <th>Quotation / customer</th>
              <th>Payment evidence</th>
              <th>Expected / submitted</th>
              <th>Status</th>
              <th>Finance decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td>
                  <strong>{x.quotation.quotationNumber}</strong>
                  <br />
                  <span className="text-xs text-slate-500">
                    {x.quotation.quotationRequest?.email}
                  </span>
                  {x.order ? (
                    <>
                      <br />
                      <Link
                        className="text-xs font-bold text-sky-700"
                        href={`/admin/orders/${x.order.id}`}
                      >
                        {x.order.orderNumber}
                      </Link>
                    </>
                  ) : null}
                </td>
                <td>
                  <Link
                    className="font-semibold text-sky-700 underline"
                    href={`/api/documents/${x.documentId}`}
                    target="_blank"
                  >
                    {x.document.originalName}
                  </Link>
                  <br />
                  <span className="text-xs text-slate-500">
                    {x.paymentDate.toLocaleDateString("en-ZA")} · Ref{" "}
                    {x.paymentReference}
                  </span>
                </td>
                <td>
                  Expected R {x.quotation.grandTotal.toString()}
                  <br />
                  <strong>Submitted R {x.amount.toString()}</strong>
                </td>
                <td>
                  <StatusBadge value={x.status} />
                  {x.rejectionReason ? (
                    <p className="mt-1 max-w-xs text-xs text-red-700">
                      {x.rejectionReason}
                    </p>
                  ) : null}
                </td>
                <td>
                  {x.status === "PENDING_VERIFICATION" ? (
                    <form
                      action={verifyPaymentSubmission}
                      className="grid min-w-64 gap-2"
                    >
                      <input type="hidden" name="id" value={x.id} />
                      <textarea
                        className={`${inputClass} min-h-16`}
                        name="note"
                        placeholder="Internal note or customer correction reason"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          name="decision"
                          value="VERIFIED"
                          className="bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                        >
                          Verify & create order
                        </button>
                        <button
                          name="decision"
                          value="CORRECTION_REQUIRED"
                          className="border border-amber-400 px-3 py-2 text-xs font-bold text-amber-800"
                        >
                          Request correction
                        </button>
                        <button
                          name="decision"
                          value="REJECTED"
                          className="border border-red-300 px-3 py-2 text-xs font-bold text-red-800"
                        >
                          Reject
                        </button>
                      </div>
                    </form>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Reviewed{" "}
                      {x.verification?.verifiedAt.toLocaleString("en-ZA")}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </AdminPage>
  );
}
