import Link from "next/link";
import { hasPermission } from "@/domain/auth/permissions";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { AdminPage, EmptyState, MetricCard, Panel, StatusBadge, buttonClass, tableClass } from "@/components/admin/admin-ui";

export const dynamic = "force-dynamic";

export default async function PartnerPayoutsPage() {
  const context = await requireUser();
  const canPrepare = hasPermission(context.grants, "partner_sales.payout.prepare", context.isSuperAdministrator);
  const canApprove = hasPermission(context.grants, "partner_sales.payout.approve", context.isSuperAdministrator);
  if (!canPrepare && !canApprove) return null;
  const batches = await prisma.partnerPayoutBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      batchNumber: true,
      status: true,
      total: true,
      currency: true,
      periodStart: true,
      periodEnd: true,
      createdAt: true,
      partnership: { select: { partnerNumber: true } },
      preparedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
      _count: { select: { items: true } },
    },
  });
  const pending = batches.filter((batch) => batch.status === "PENDING_APPROVAL").length;
  const paid = batches.filter((batch) => batch.status === "PAID").length;
  return <AdminPage title="Partner payout batches" description="Prepare payable commission batches, obtain independent finance approval, and record EFT evidence. Batch totals and ledger history remain immutable." actions={<Link className={buttonClass} href="/admin/partnerships">Partnerships</Link>}>
    <div className="grid gap-3 sm:grid-cols-3"><MetricCard label="Batches" value={batches.length} detail="Prepared settlement records" /><MetricCard label="Awaiting approval" value={pending} detail="Maker-checker queue" /><MetricCard label="Paid" value={paid} detail="EFT evidence recorded" /></div>
    <Panel title="Settlement queue" description="Supplier, gateway, internal cost and internal notes are never included in partner statements.">
      {batches.length === 0 ? <EmptyState title="No payout batches" description="Payable, completed and reconciled commissions will appear here when finance prepares a batch." /> : <div className="-mx-4 overflow-x-auto"><table className={tableClass}><thead><tr><th>Batch</th><th>Partner</th><th>Period</th><th>Items</th><th>Total</th><th>Status</th><th /></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}><td><Link className="font-semibold text-sky-700 underline" href={`/admin/partnerships/payouts/${batch.id}`}>{batch.batchNumber}</Link><p className="text-xs text-slate-500">Prepared by {batch.preparedBy.name ?? batch.preparedBy.email}</p></td><td>{batch.partnership.partnerNumber}</td><td>{batch.periodStart.toLocaleDateString("en-ZA")} – {batch.periodEnd.toLocaleDateString("en-ZA")}</td><td>{batch._count.items}</td><td className="whitespace-nowrap font-semibold">{batch.currency} {Number(batch.total).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td><td><StatusBadge value={batch.status} /></td><td><Link className="font-semibold text-sky-700" href={`/admin/partnerships/payouts/${batch.id}`}>Review</Link></td></tr>)}</tbody></table></div>}
    </Panel>
  </AdminPage>;
}

