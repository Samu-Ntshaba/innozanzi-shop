import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePartnerSalesContext } from "@/domain/partner-sales/access";
import { partnerOrder } from "@/domain/partner-sales/orders";
import { formatZar } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PartnerOrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { partnership } = await requirePartnerSalesContext();
  const { orderNumber } = await params;
  const order = await partnerOrder({ partnership }, decodeURIComponent(orderNumber));
  if (!order) notFound();

  return <main className="mx-auto min-w-0 max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
    <Link className="text-sm font-bold text-sky-700" href="/account/partner/orders">← Order tracking</Link>
    <div className="mt-4 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[.18em] text-sky-700">Partner order</p><h1 className="mt-2 break-all text-2xl font-black tracking-tight text-slate-950 sm:break-words sm:text-3xl">{order.orderNumber}</h1>{order.caseNumber ? <p className="mt-2 text-sm text-slate-500">Partner case {order.caseNumber}</p> : null}</div><span className="w-fit rounded-full bg-sky-100 px-3 py-2 text-xs font-black text-sky-800">{order.statusLabel}</span></div>
    {order.customerVisibleNotes ? <p className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">{order.customerVisibleNotes}</p> : null}
    <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,.75fr)]">
      <div className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="font-black text-slate-950">Order progress</h2><div className="mt-5 space-y-4">{order.timeline.map((event, index) => <div className="relative border-l-2 border-sky-500 pb-5 pl-5 last:pb-0" key={`${event.occurredAt}-${event.status}-${index}`}><span className="absolute -left-[7px] top-0 size-3 rounded-full bg-sky-600"/><p className="text-sm font-bold">{event.label}</p><p className="text-xs text-slate-500">{new Date(event.occurredAt).toLocaleString("en-ZA")}</p>{event.publicNote ? <p className="mt-1 text-sm leading-6 text-slate-700">{event.publicNote}</p> : null}</div>)}{!order.timeline.length ? <p className="text-sm text-slate-500">Your order progress will appear here as Innozanzi confirms each milestone.</p> : null}</div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="font-black text-slate-950">Items</h2><div className="mt-3 divide-y divide-slate-100">{order.items.map((item) => <div className="flex min-w-0 justify-between gap-4 py-3 text-sm" key={item.id}><span className="min-w-0 break-words">{item.productName}{item.variantName ? ` · ${item.variantName}` : ""}<span className="block text-xs text-slate-500">{item.sku} · quantity {item.quantity}</span></span><span className="shrink-0 font-bold">{formatZar(item.lineTotal ?? "0")}</span></div>)}</div></section>
        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5"><h2 className="font-black text-sky-950">Delivery tracking</h2>{order.shipments.length ? <div className="mt-3 space-y-3">{order.shipments.map((shipment, index) => <div className="rounded-xl bg-white/80 p-3 text-sm" key={shipment.id}><div className="flex flex-wrap justify-between gap-2"><strong>{order.shipments.length > 1 ? `Shipment ${index + 1}` : "Shipment"}</strong><span className="font-bold text-sky-800">{(shipment.status ?? "PENDING").replaceAll("_", " ")}</span></div><p className="mt-1 text-slate-600">{shipment.carrier ?? "Delivery provider to be confirmed"}{shipment.estimatedDeliveryAt ? ` · expected ${new Date(shipment.estimatedDeliveryAt).toLocaleDateString("en-ZA")}` : ""}</p>{shipment.trackingNumber ? <p className="mt-1 break-all">Tracking: {shipment.trackingUrl ? <a className="font-bold text-sky-700 underline" href={shipment.trackingUrl} rel="noreferrer" target="_blank">{shipment.trackingNumber}</a> : shipment.trackingNumber}</p> : null}</div>)}</div> : <p className="mt-2 text-sm text-sky-900">Tracking will appear when a delivery is arranged.</p>}</section>
      </div>
      <aside className="h-fit min-w-0 space-y-5"><section className="rounded-2xl bg-[#071b33] p-5 text-white"><h2 className="font-black">Commission</h2>{order.commission ? <><p className="mt-3 text-2xl font-black">{formatZar(order.commission.currentAmount ?? "0")}</p><p className="mt-1 text-sm text-slate-300">{(order.commission.status ?? "PENDING").replaceAll("_", " ")}</p><p className="mt-3 text-xs leading-5 text-slate-400">Commission follows the agreed partner terms and is updated as the order reaches completion.</p></> : <p className="mt-2 text-sm text-slate-300">Commission details are not available for this order yet.</p>}</section><section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600"><h2 className="font-bold text-slate-950">Order support</h2><p className="mt-2 leading-6">Innozanzi manages payment, fulfilment and delivery operations for this customer order.</p><Link className="mt-3 inline-block font-bold text-sky-700 underline" href="/account/support">Contact support</Link></section></aside>
    </div>
  </main>;
}
