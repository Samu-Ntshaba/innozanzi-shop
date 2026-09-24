import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/domain/auth/session";
import { AdminPage, EmptyState, MetricCard, Panel, StatusBadge, buttonClass, dangerButtonClass, inputClass, tableClass } from "@/components/admin/admin-ui";

const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());

export default async function PartnerCommissionQueue() {
  await requirePermission("partner_sales.commission.manage");
  const commissions = await prisma.partnerCommission.findMany({
    where: { status: { not: "REVERSED" } },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      status: true,
      currentAmount: true,
      heldAmount: true,
      adjustedAmount: true,
      reversedAmount: true,
      currency: true,
      updatedAt: true,
      partnership: { select: { partnerNumber: true } },
      quoteCase: { select: { caseNumber: true, status: true } },
      order: { select: { id: true, orderNumber: true, status: true, paymentStatus: true, completedAt: true } },
      entries: { orderBy: { createdAt: "desc" }, take: 5, select: { type: true, amount: true, balanceAfter: true, reason: true, createdAt: true } },
    },
  });
  const payable = commissions.filter((commission) => commission.status === "PAYABLE").length;
  const held = commissions.filter((commission) => commission.status === "HELD").length;
  const paid = commissions.filter((commission) => commission.status === "PAID").length;

  return (
    <AdminPage title="Partner commission ledger" description="Review evidence-backed commission balances. Every hold, adjustment, reversal and correction appends an immutable ledger entry; historical paid entries are never edited.">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Payable" value={payable} detail="Completed and reconciled" />
        <MetricCard label="Held" value={held} detail="Requires an exception decision" />
        <MetricCard label="Paid" value={paid} detail="Corrections remain append-only" />
      </div>
      <Panel title="Exception and payout queue" description="Order status, payment state and ledger evidence remain visible to Admin only.">
        {commissions.length === 0 ? <EmptyState title="No partner commissions" description="Approved partner quotations will appear after verified payment links them to an order." /> : <div className="-mx-4 overflow-x-auto"><table className={tableClass}><thead><tr><th>Partner / case</th><th>Order evidence</th><th>Status</th><th>Balance</th><th>Ledger evidence</th><th>Controls</th></tr></thead><tbody>{commissions.map((commission) => { const endpoint = `/api/admin/partner-sales/commissions/${commission.id}`; return <tr key={commission.id}><td><span className="font-semibold">{commission.partnership.partnerNumber}</span><br /><span className="text-xs text-slate-500">{commission.quoteCase.caseNumber} · {label(commission.quoteCase.status)}</span></td><td>{commission.order ? <><Link className="font-semibold text-sky-700 underline" href={`/admin/orders/${commission.order.id}`}>{commission.order.orderNumber}</Link><br /><span className="text-xs text-slate-500">{label(commission.order.status)} · {label(commission.order.paymentStatus)}</span></> : "Not linked to an order"}</td><td><StatusBadge value={commission.status} /><p className="mt-1 text-xs text-slate-500">Updated {commission.updatedAt.toLocaleString("en-ZA")}</p></td><td className="whitespace-nowrap font-semibold">{commission.currency} {Number(commission.currentAmount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}<p className="text-xs font-normal text-slate-500">Held {Number(commission.heldAmount).toFixed(2)} · Reversed {Number(commission.reversedAmount).toFixed(2)}</p></td><td className="max-w-sm text-xs">{commission.entries.length === 0 ? "No entries" : commission.entries.map((entry) => <p key={`${entry.type}-${entry.createdAt.toISOString()}`} className="mb-1"><span className="font-semibold">{entry.type}</span> {Number(entry.amount).toFixed(4)} → {Number(entry.balanceAfter).toFixed(4)}<br /><span className="text-slate-500">{entry.reason}</span></p>)}</td><td><div className="space-y-2"><form action={endpoint} method="post" className="space-y-2"><input type="hidden" name="operation" value="hold" /><input className={inputClass} name="reason" required minLength={10} maxLength={1000} placeholder="Hold reason" /><button className={dangerButtonClass} type="submit">Hold</button></form><form action={endpoint} method="post" className="space-y-2"><input type="hidden" name="operation" value="adjust" /><input className={inputClass} name="amount" required inputMode="decimal" placeholder="+ adjustment" /><input className={inputClass} name="reason" required minLength={10} maxLength={1000} placeholder="Adjustment reason" /><button className={buttonClass} type="submit">Adjust</button></form><form action={endpoint} method="post" className="space-y-2"><input type="hidden" name="operation" value="reverse" /><input className={inputClass} name="amount" inputMode="decimal" placeholder="Full balance if blank" /><input className={inputClass} name="reason" required minLength={10} maxLength={1000} placeholder="Reversal reason" /><button className={dangerButtonClass} type="submit">Reverse</button></form></div></td></tr>; })}</tbody></table></div>}
      </Panel>
    </AdminPage>
  );
}
