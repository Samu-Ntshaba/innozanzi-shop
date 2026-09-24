import Link from "next/link";
import { requirePartnerSalesContext } from "@/domain/partner-sales/access";
import { partnerOrders } from "@/domain/partner-sales/orders";
import { formatZar } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PartnerOrdersPage() {
  const { partnership } = await requirePartnerSalesContext();
  const orders = await partnerOrders({ partnership });

  return <main className="mx-auto min-w-0 max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
    <p className="text-xs font-black uppercase tracking-[.18em] text-sky-700">Partner sales</p>
    <div className="mt-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Order tracking</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Follow customer-facing progress for your paid sales. Innozanzi manages payment, supplier fulfilment and operational actions.</p>
      </div>
      <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-bold text-sky-700" href="/account/partner/sales">Quotation cases</Link>
    </div>
    <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="divide-y divide-slate-100">
        {orders.map((order) => <Link className="grid min-w-0 gap-3 p-4 transition hover:bg-sky-50 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:p-5" href={`/account/partner/orders/${encodeURIComponent(order.orderNumber ?? "")}`} key={order.id}>
          <div className="min-w-0"><strong className="break-all text-slate-950 sm:break-words">{order.orderNumber}</strong><p className="mt-1 text-xs text-slate-500">{order.caseNumber ? `Case ${order.caseNumber} · ` : ""}{order.items.length} item{order.items.length === 1 ? "" : "s"}</p></div>
          <span className="text-sm font-bold text-slate-700">{order.statusLabel}</span>
          <span className="text-sm font-black text-slate-900">{order.commission ? `${(order.commission.status ?? "PENDING").replaceAll("_", " ")} · ${formatZar(order.commission.currentAmount ?? "0")}` : "Commission pending"}</span>
        </Link>)}
      </div>
      {!orders.length ? <p className="px-5 py-12 text-center text-sm text-slate-500">No partner orders are available yet.</p> : null}
    </section>
  </main>;
}
