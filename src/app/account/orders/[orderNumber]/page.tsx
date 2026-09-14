import Link from "next/link";
import { customerOrderStatusLabel } from "@/domain/orders/lifecycle";
import { notFound } from "next/navigation";
import { OrderPaymentPanel } from "@/components/account/order-payment-panel";
import { OrderProgress } from "@/components/orders/order-progress";
import { requireUser } from "@/domain/auth/session";
import { orderCompletionWindowDays, returnWindowEnd } from "@/domain/orders/settings";
import { getRetailPaymentSettings } from "@/domain/payments/settings";
import { gatewayConfigured } from "@/integrations/payments/approved-gateways";
import { formatZar } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { PaymentStatusRefresh } from "@/components/account/payment-status-refresh";

export default async function TrackOrder({ params, searchParams }: { params: Promise<{ orderNumber: string }>; searchParams: Promise<{ quotation?: string; payment?: string }> }) {
  const ctx = await requireUser();
  const { orderNumber } = await params;
  const query = await searchParams;
  const paymentReturn = ["processing", "cancelled", "error"].includes(query.payment??"");
  const [order, completionDays, eftSettings] = await Promise.all([
    prisma.order.findFirst({ where: { userId: ctx.user.id, ...(!paymentReturn?{OR: [{ paymentStatus: { in: ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"] } }, { status: "CANCELLED" }]}:{}), ...(orderNumber === "by-quotation" && query.quotation ? { convertedQuotation: { quotationNumber: query.quotation } } : { orderNumber }) }, include: { invoices:{where:{status:"PAID"},select:{invoiceNumber:true},take:1},items: true, deliveryEvents: { orderBy: { occurredAt: "asc" } }, shipments: { orderBy: { createdAt: "desc" } }, procurements: { select: { orderedAt: true, confirmedAt: true }, orderBy: { createdAt: "asc" } }, returnCases: { select: { id: true, status: true } } } }),
    orderCompletionWindowDays(),
    getRetailPaymentSettings(),
  ]);
  if (!order) notFound();
  const unpaid = ["AWAITING_PAYMENT", "PAYMENT_UNDER_REVIEW"].includes(order.status) && order.paymentStatus !== "PAID";
  const shipment = order.shipments[0];
  const supplierOrderedAt = order.procurements.map(item => item.orderedAt).filter((date): date is Date => Boolean(date)).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const supplierConfirmedAt = order.procurements.map(item => item.confirmedAt).filter((date): date is Date => Boolean(date)).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const returnWindowEndsAt = shipment?.deliveredAt ? returnWindowEnd(shipment.deliveredAt, completionDays) : null;
  return <main className="mx-auto min-w-0 max-w-5xl px-4 py-7 sm:py-10">
    <p className="text-xs font-bold uppercase tracking-wider text-sky-700">{unpaid ? "Order payment" : "Delivery tracking"}</p>
    <div className="mt-2 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><h1 className="min-w-0 break-all text-2xl font-black sm:break-words sm:text-3xl">Order {order.orderNumber}</h1><div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:w-auto"> <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border px-3 text-center text-sm font-bold text-sky-700" href="/account/orders">All orders</Link>{!unpaid ? <>{order.invoices[0]?<a className="inline-flex min-h-11 items-center justify-center rounded-lg border px-3 text-sm font-bold text-sky-700" href={`/api/invoices/${encodeURIComponent(order.invoices[0].invoiceNumber)}/pdf`} target="_blank">Invoice</a>:null}<a className="inline-flex min-h-11 items-center justify-center rounded-lg border px-3 text-center text-sm font-bold text-sky-700" href={`/api/orders/${order.orderNumber}/delivery-note`} target="_blank">Delivery note</a><Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-sky-700 px-3 text-center text-sm font-bold text-white min-[420px]:col-span-2 sm:col-span-1" href={`/account/returns/new?order=${order.orderNumber}`}>Get product help</Link></> : null}</div></div>
    {unpaid ? <><PaymentStatusRefresh active={query.payment==="processing"}/><OrderPaymentPanel order={order} notice={query.payment} payfastAvailable={gatewayConfigured("PAYFAST")} ozowAvailable={gatewayConfigured("OZOW")} eftSettings={eftSettings}/></> : <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 sm:p-6"><h2 className="mb-5 text-xl font-black">Order progress</h2><OrderProgress status={order.status} details={{ placedAt: order.placedAt, estimatedDeliveryAt: shipment?.estimatedDeliveryAt, deliveredAt: shipment?.deliveredAt, returnWindowEndsAt, supplierOrderedAt, supplierConfirmedAt, events: order.deliveryEvents }}/></section>}
    {order.status === "DELIVERED" && returnWindowEndsAt ? <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><strong>Delivered successfully</strong><p className="mt-1">Your order remains open for returns or refund requests until {returnWindowEndsAt.toLocaleString("en-ZA", { dateStyle: "long", timeStyle: "short" })}. An open request prevents automatic closure.</p></section> : null}
    {!unpaid && shipment ? <section className="mt-4 grid gap-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm sm:grid-cols-3"><div><strong>Delivery company</strong><p className="mt-1 break-words">{shipment.deliveryCompany ?? "Being arranged"}</p></div><div><strong>Estimated delivery</strong><p className="mt-1">{shipment.estimatedDeliveryAt?.toLocaleString("en-ZA") ?? "To be confirmed"}</p></div><div><strong>Courier tracking</strong><p className="mt-1 break-all">{shipment.trackingUrl ? <a className="text-sky-700 underline" href={shipment.trackingUrl} target="_blank">{shipment.trackingNumber ?? "Open courier tracking"}</a> : shipment.trackingNumber ?? "Not available yet"}</p></div></section> : null}
    <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><strong>Need to cancel?</strong><p className="mt-1 leading-6">Contact support with your order number. Cancellation is reviewed against the fulfilment stage and is completed only after any required refund is confirmed.</p><Link className="mt-2 inline-block font-bold text-sky-700 underline" href="/account/support">Contact support</Link></section>
    <div className="mt-6 grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(16rem,.8fr)]">
      {!unpaid ? <section className="min-w-0 rounded-xl border bg-white p-4 sm:p-5"><h2 className="font-bold">Verified updates</h2><div className="mt-5">{order.deliveryEvents.map((event, index) => <div className="relative border-l-2 border-sky-500 pb-7 pl-5 last:pb-0" key={event.id}><span className="absolute -left-[7px] top-0 size-3 rounded-full bg-sky-600"/><p className="font-semibold">{customerOrderStatusLabel(event.status)}</p><p className="text-xs text-slate-500">{event.occurredAt.toLocaleString("en-ZA")}</p>{event.publicNote ? <p className="mt-1 text-sm leading-6 text-slate-700">{event.publicNote}</p> : null}{index === order.deliveryEvents.length - 1 ? <span className="mt-2 inline-block rounded bg-sky-50 px-2 py-1 text-xs font-bold text-sky-800">Latest update</span> : null}</div>)}</div></section> : <section className="rounded-xl border bg-slate-50 p-5 text-sm text-slate-700"><h2 className="font-bold text-slate-950">What happens next?</h2><p className="mt-2 leading-6">Complete a PayFast or Ozow payment. Products are only reserved and fulfilment only begins after payment verification.</p></section>}
      <aside className="h-fit min-w-0 rounded-xl bg-slate-900 p-5 text-white"><h2 className="font-bold">Order summary</h2><p className="mt-2 text-2xl font-black">{formatZar(order.grandTotal.toString())}</p><p className="mt-1 text-xs text-slate-400">{unpaid ? "Unpaid" : order.paymentStatus.replaceAll("_", " ")}</p><div className="mt-4 divide-y divide-slate-700">{order.items.map(item => <div className="flex min-w-0 justify-between gap-3 py-3 text-sm" key={item.id}><span className="min-w-0 break-words">{item.productName}</span><span className="shrink-0">× {item.quantity}</span></div>)}</div></aside>
    </div>
  </main>;
}
