import Link from "next/link";
import { notFound } from "next/navigation";
import { hasPermission } from "@/domain/auth/permissions";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { AdminPage, Panel, StatusBadge, buttonClass, dangerButtonClass, inputClass, secondaryButtonClass, tableClass } from "@/components/admin/admin-ui";

export const dynamic = "force-dynamic";

export default async function PartnerPayoutDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; message?: string }> }) {
  const context = await requireUser();
  const canPrepare = hasPermission(context.grants, "partner_sales.payout.prepare", context.isSuperAdministrator);
  const canApprove = hasPermission(context.grants, "partner_sales.payout.approve", context.isSuperAdministrator);
  if (!canPrepare && !canApprove) return null;
  const { id } = await params;
  const batch = await prisma.partnerPayoutBatch.findUnique({ where: { id }, include: { partnership: { select: { partnerNumber: true } }, preparedBy: { select: { name: true, email: true } }, approvedBy: { select: { name: true, email: true } }, items: { orderBy: { createdAt: "asc" }, include: { commission: { select: { id: true, status: true, currentAmount: true, quoteCase: { select: { caseNumber: true } }, order: { select: { orderNumber: true } } } } } } } });
  if (!batch) notFound();
  const query = await searchParams;
  const activeItems = batch.items.filter((item) => item.status === "ACTIVE");
  return <AdminPage title={`Payout ${batch.batchNumber}`} description="Review the immutable payable membership and record independent approval or EFT evidence." actions={<Link className={secondaryButtonClass} href="/admin/partnerships/payouts">All payout batches</Link>}>
    {query.status === "saved" ? <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Payout batch updated.</p> : null}
    {query.status === "error" ? <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{query.message ?? "The payout batch could not be updated."}</p> : null}
    <div className="grid gap-3 sm:grid-cols-4"><Panel><p className="text-xs uppercase tracking-wide text-slate-500">Partner</p><p className="mt-1 font-semibold">{batch.partnership.partnerNumber}</p></Panel><Panel><p className="text-xs uppercase tracking-wide text-slate-500">Status</p><div className="mt-2"><StatusBadge value={batch.status} /></div></Panel><Panel><p className="text-xs uppercase tracking-wide text-slate-500">Immutable total</p><p className="mt-1 font-semibold">{batch.currency} {Number(batch.total).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p></Panel><Panel><p className="text-xs uppercase tracking-wide text-slate-500">Period</p><p className="mt-1 text-sm">{batch.periodStart.toLocaleDateString("en-ZA")} – {batch.periodEnd.toLocaleDateString("en-ZA")}</p></Panel></div>
    <Panel title="Included commissions" description={`${activeItems.length} active item${activeItems.length === 1 ? "" : "s"}. Cancelled membership remains visible for audit.`}><div className="-mx-4 overflow-x-auto"><table className={tableClass}><thead><tr><th>Case</th><th>Order</th><th>Amount</th><th>Commission status</th><th>Item</th></tr></thead><tbody>{batch.items.map((item) => <tr key={item.id}><td>{item.commission.quoteCase?.caseNumber ?? "—"}</td><td>{item.commission.order?.orderNumber ?? "—"}</td><td className="font-semibold">{batch.currency} {Number(item.amount).toFixed(4)}</td><td><StatusBadge value={item.commission.status} /></td><td>{item.status}</td></tr>)}</tbody></table></div></Panel>
    <Panel title="Finance controls" description={`Prepared by ${batch.preparedBy.name ?? batch.preparedBy.email}${batch.approvedBy ? ` · approved by ${batch.approvedBy.name ?? batch.approvedBy.email}` : ""}. Approval and preparation require separate permissions.`}>
      <div className="flex flex-wrap gap-3">{canApprove && batch.status === "PENDING_APPROVAL" ? <form action={`/api/admin/partner-sales/payouts/${batch.id}`} method="post"><input type="hidden" name="operation" value="approve" /><button className={buttonClass}>Approve batch</button></form> : null}{canApprove && batch.status === "APPROVED" ? <form action={`/api/admin/partner-sales/payouts/${batch.id}`} method="post" className="grid w-full gap-2 sm:max-w-xl sm:grid-cols-2"><input type="hidden" name="operation" value="paid" /><label className="text-sm font-semibold">EFT reference<input className={inputClass} name="paymentReference" minLength={3} maxLength={120} required /></label><label className="text-sm font-semibold">Payment date<input className={inputClass} name="paymentDate" type="date" required /></label><label className="text-sm font-semibold sm:col-span-2">Proof document ID<input className={inputClass} name="proofDocumentId" type="text" required placeholder="UploadedDocument UUID" /></label><button className={buttonClass} type="submit">Record EFT payment</button></form> : null}{canPrepare && !["PAID", "CANCELLED"].includes(batch.status) ? <form action={`/api/admin/partner-sales/payouts/${batch.id}`} method="post" className="flex flex-wrap gap-2"><input type="hidden" name="operation" value="cancel" /><input className={inputClass} name="reason" minLength={10} maxLength={1000} required placeholder="Cancellation reason" /><button className={dangerButtonClass} type="submit">Cancel batch</button></form> : null}</div>
    </Panel>
  </AdminPage>;
}

