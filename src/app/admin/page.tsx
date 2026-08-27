import { ArrowRight, Banknote, CircleAlert, PackageCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { AdminPage, Panel } from "@/components/admin/admin-ui";
import { getAdminDashboard } from "@/domain/admin/queries";
import { requirePermission } from "@/domain/auth/session";

const currency = (value: string) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(Number(value));

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "sky",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Banknote;
  tone?: "sky" | "emerald" | "amber" | "slate";
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={`grid size-9 shrink-0 place-items-center rounded-full ${tones[tone]}`}>
          <Icon aria-hidden="true" size={17} />
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function Bar({
  label,
  value,
  maximum,
  href,
}: {
  label: string;
  value: number;
  maximum: number;
  href: string;
}) {
  const width = value === 0 ? 0 : Math.max(8, (value / maximum) * 100);
  return (
    <Link href={href} className="group block rounded-sm px-1 py-2 hover:bg-slate-50">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-700 group-hover:text-sky-700">{label}</span>
        <span className="font-semibold tabular-nums text-slate-950">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-sky-600" style={{ width: `${width}%` }} />
      </div>
    </Link>
  );
}

export default async function AdminDashboard() {
  await requirePermission("reports.view");
  const dashboard = await getAdminDashboard();

  const attentionTotal =
    dashboard.quotesToApprove +
    dashboard.pendingPayments +
    dashboard.partnershipApplications +
    dashboard.unassignedPartnerRequests +
    dashboard.openHelpDesk +
    dashboard.lowStock + dashboard.overdueOrders + dashboard.openReturns;

  const workflow = [
    { label: "New requests", value: dashboard.openRequests, href: "/admin/quotations" },
    { label: "Review", value: dashboard.quotesToApprove, href: "/admin/quotations" },
    { label: "Payment", value: dashboard.awaitingPayment, href: "/admin/payments" },
    { label: "Delivery", value: dashboard.deliveriesInProgress, href: "/admin/logistics" },
  ];

  const workloads = [
    { label: "Sales & quotations", value: dashboard.openRequests + dashboard.quotesToApprove, href: "/admin/quotations" },
    { label: "Finance", value: dashboard.pendingPayments + dashboard.awaitingPayment, href: "/admin/payments" },
    { label: "Fulfilment", value: dashboard.activeOrders + dashboard.deliveriesInProgress, href: "/admin/orders" },
    { label: "Partnerships", value: dashboard.partnershipApplications + dashboard.unassignedPartnerRequests, href: "/admin/partnerships" },
    { label: "Customer support", value: dashboard.openHelpDesk, href: "/admin/help-desk" },
  ];
  const maximumWorkload = Math.max(1, ...workloads.map(({ value }) => value));
  const priorityQueues = [
    { label: "Paid orders to accept", value: dashboard.paidOrdersToAccept, href: "/admin/orders" },
    { label: "Supplier procurement", value: dashboard.procurementOrders, href: "/admin/orders" },
    { label: "Ready for delivery", value: dashboard.readyForDelivery, href: "/admin/orders" },
    { label: "Overdue fulfilment", value: dashboard.overdueOrders, href: "/admin/orders" },
    { label: "Open returns & complaints", value: dashboard.openReturns, href: "/admin/returns" },
    { label: "Quotation approvals", value: dashboard.quotesToApprove, href: "/admin/quotations" },
    { label: "Payment verification", value: dashboard.pendingPayments, href: "/admin/payments" },
    { label: "Stock exceptions", value: dashboard.lowStock, href: "/admin/inventory" },
    { label: "Unassigned partner requests", value: dashboard.unassignedPartnerRequests, href: "/admin/partnerships/requests" },
  ].sort((a, b) => b.value - a.value);

  return (
    <AdminPage
      title="Overview"
      description="A clear view of commercial performance and the work that needs attention."
      actions={
        <span className="inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          <span className="size-2 rounded-full bg-emerald-500" />
          Systems operational
        </span>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Verified revenue" value={currency(dashboard.revenue)} detail={`${dashboard.completedOrders} completed orders`} icon={Banknote} tone="emerald" />
        <SummaryCard label="Quotation pipeline" value={currency(dashboard.pipeline)} detail={`${dashboard.awaitingPayment} awaiting payment`} icon={TrendingUp} />
        <SummaryCard label="Orders in progress" value={dashboard.activeOrders + dashboard.deliveriesInProgress} detail={`${dashboard.deliveriesInProgress} currently in delivery`} icon={PackageCheck} tone="slate" />
        <SummaryCard label="Needs attention" value={attentionTotal} detail="Across all operational teams" icon={CircleAlert} tone={attentionTotal > 0 ? "amber" : "emerald"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Panel title="Quotation to delivery" description="Current volume at each stage of the customer journey.">
          <div className="grid gap-2 sm:grid-cols-4">
            {workflow.map((stage, index) => (
              <div className="flex min-w-0 items-center gap-2" key={stage.label}>
                <Link className="group min-w-0 flex-1 border border-slate-200 bg-slate-50 p-3 hover:border-sky-300 hover:bg-sky-50" href={stage.href}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{stage.label}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950 group-hover:text-sky-700">{stage.value}</p>
                </Link>
                {index < workflow.length - 1 ? <ArrowRight aria-hidden="true" className="hidden shrink-0 text-slate-300 sm:block" size={15} /> : null}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span><strong className="text-slate-800">{dashboard.expiredQuotes}</strong> expired quotations</span>
            <span><strong className="text-slate-800">{dashboard.completedOrders}</strong> completed orders</span>
            <span><strong className="text-slate-800">{dashboard.verifiedPayments}</strong> verified payments</span>
          </div>
        </Panel>

        <Panel title="Workload by team" description="Relative open workload; select a bar to open its queue.">
          <div className="space-y-1">
            {workloads.map((item) => <Bar {...item} maximum={maximumWorkload} key={item.label} />)}
          </div>
        </Panel>
      </div>

      <Panel
        title="Priority queues"
        description="The most important exceptions requiring action."
        actions={<Link className="text-xs font-semibold text-sky-700 hover:underline" href="/admin/reports">View reports</Link>}
      >
        <div className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-3">
          {priorityQueues.map((queue) => (
            <Link className="flex items-center justify-between gap-3 bg-white p-3 hover:bg-sky-50" href={queue.href} key={queue.label}>
              <span className="text-sm font-medium text-slate-700">{queue.label}</span>
              <span className={`min-w-7 rounded-full px-2 py-1 text-center text-xs font-bold tabular-nums ${queue.value > 0 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>
                {queue.value}
              </span>
            </Link>
          ))}
        </div>
      </Panel>
    </AdminPage>
  );
}
