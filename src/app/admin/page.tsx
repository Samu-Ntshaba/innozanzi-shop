import Link from "next/link";
import { AdminPage, MetricCard, Panel } from "@/components/admin/admin-ui";
import { getAdminDashboard } from "@/domain/admin/queries";
import { requirePermission } from "@/domain/auth/session";

export default async function AdminDashboard() {
  await requirePermission("reports.view");
  const dashboard = await getAdminDashboard();
  const metrics = [
    ["New quote requests", dashboard.openRequests, "Sales qualification"], ["Under review", dashboard.quotesToApprove, "Provisional documents"], ["Awaiting payment", dashboard.awaitingPayment, "Live final quotations"],
    ["Payment verification", dashboard.pendingPayments, "Finance action required"], ["Active orders", dashboard.activeOrders, "Fulfilment work"], ["Deliveries in progress", dashboard.deliveriesInProgress, "Dispatched or in transit"],
    ["Partnership review", dashboard.partnershipApplications, "Applications requiring action"], ["Unassigned partner requests", dashboard.unassignedPartnerRequests, "Ownership required"], ["Open help desk", dashboard.openHelpDesk, "Customer support workload"],
  ] as const;
  const queues = [
    ["Review quotations", dashboard.quotesToApprove, "/admin/quotations"], ["Verify proof of payment", dashboard.pendingPayments, "/admin/payments"], ["Progress active orders", dashboard.activeOrders, "/admin/orders"],
    ["Review partnership applications", dashboard.partnershipApplications, "/admin/partnerships/applications"], ["Assign partner requests", dashboard.unassignedPartnerRequests, "/admin/partnerships/requests"], ["Respond to help-desk tickets", dashboard.openHelpDesk, "/admin/help-desk"], ["Resolve stock exceptions", dashboard.lowStock, "/admin/inventory"],
  ] as const;
  return <AdminPage title="Operations cockpit" description="Actionable sales, finance, fulfilment, partnership and support queues in one workspace." actions={<span className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">● SYSTEM ONLINE</span>}>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, value, detail]) => <MetricCard key={label} label={label} value={value} detail={detail}/>)}</div>
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]"><Panel><h2 className="font-semibold">Operational work queues</h2><div className="mt-3 divide-y">{queues.map(([label, value, href]) => <Link href={href} className="flex justify-between py-4 hover:text-sky-700" key={label}><span>{label}</span><strong>{value}</strong></Link>)}</div></Panel><Panel><h2 className="font-semibold">Commercial snapshot</h2><dl className="mt-4 space-y-4"><div><dt className="text-xs text-slate-500">Verified revenue</dt><dd className="text-xl font-bold">R {Number(dashboard.revenue).toLocaleString("en-ZA")}</dd></div><div><dt className="text-xs text-slate-500">Quotation pipeline</dt><dd className="text-xl font-bold">R {Number(dashboard.pipeline).toLocaleString("en-ZA")}</dd></div><div><dt className="text-xs text-slate-500">Completed orders</dt><dd className="text-xl font-bold">{dashboard.completedOrders}</dd></div><div><dt className="text-xs text-slate-500">Expired quotations</dt><dd className="text-xl font-bold">{dashboard.expiredQuotes}</dd></div></dl></Panel></div>
  </AdminPage>;
}
