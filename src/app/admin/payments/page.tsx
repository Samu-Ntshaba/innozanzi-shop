import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  AdminPage,
  Panel,
  StatusBadge,
  inputClass,
  tableClass,
} from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { verifyPaymentSubmission } from "@/domain/payments/actions";
export default async function Page() {
  await requirePermission("payments.approve");
  const rows = await prisma.paymentSubmission.findMany({
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
  });
  return (
    <AdminPage
      title="Payment verification"
      description="Proof review controls order activation. Uploading evidence never verifies payment automatically."
    >
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
