import { notFound } from "next/navigation";
import { OrderProgress } from "@/components/orders/order-progress";
import { requireUser } from "@/domain/auth/session";
import { formatZar } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function TrackOrder({params,searchParams}:{params:Promise<{orderNumber:string}>,searchParams:Promise<{quotation?:string}>}) {
  const ctx=await requireUser();
  const {orderNumber}=await params;
  const {quotation}=await searchParams;
  const order=await prisma.order.findFirst({where:{userId:ctx.user.id,...(orderNumber==="by-quotation"&&quotation?{convertedQuotation:{quotationNumber:quotation}}:{orderNumber})},include:{items:true,deliveryEvents:{orderBy:{occurredAt:"asc"}},shipments:{orderBy:{createdAt:"desc"}}}});
  if(!order)notFound();
  const shipment=order.shipments[0];
  return <main className="mx-auto max-w-4xl px-4 py-10">
    <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Delivery tracking</p>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="mt-2 text-3xl font-black">Order {order.orderNumber}</h1><p className="mt-2 text-slate-600">Follow every verified fulfilment and delivery update.</p></div><a className="rounded-lg border px-4 py-2 font-bold text-sky-700" href={`/api/orders/${order.orderNumber}/delivery-note`} target="_blank">Delivery note</a></div>
    <section className="mt-6 rounded-xl border bg-white p-5"><h2 className="mb-4 font-bold">Current fulfilment stage</h2><OrderProgress status={order.status}/></section>
    {shipment?<section className="mt-4 grid gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm sm:grid-cols-3"><div><strong>Delivery company</strong><p>{shipment.deliveryCompany??"Being arranged"}</p></div><div><strong>Planned delivery</strong><p>{shipment.estimatedDeliveryAt?.toLocaleString("en-ZA")??"To be confirmed"}</p></div><div><strong>Tracking</strong><p>{shipment.trackingUrl?<a className="text-sky-700 underline" href={shipment.trackingUrl} target="_blank">{shipment.trackingNumber??"Open tracking"}</a>:shipment.trackingNumber??"Not available yet"}</p></div></section>:null}
    <div className="mt-6 grid gap-5 md:grid-cols-[1fr_.8fr]"><section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Status history</h2><div className="mt-5">{order.deliveryEvents.map((event,index)=><div className="relative border-l-2 border-sky-500 pb-7 pl-5 last:pb-0" key={event.id}><span className="absolute -left-[7px] top-0 size-3 rounded-full bg-sky-600"/><p className="font-semibold">{event.status.replaceAll("_"," ")}</p><p className="text-xs text-slate-500">{event.occurredAt.toLocaleString("en-ZA")}</p>{event.publicNote?<p className="mt-1 text-sm text-slate-700">{event.publicNote}</p>:null}{index===order.deliveryEvents.length-1?<span className="mt-2 inline-block rounded bg-sky-50 px-2 py-1 text-xs font-bold text-sky-800">Current stage</span>:null}</div>)}</div></section><aside className="h-fit rounded-xl bg-slate-900 p-5 text-white"><h2 className="font-bold">Order snapshot</h2><p className="mt-2 text-2xl font-black">{formatZar(order.grandTotal.toString())}</p><div className="mt-4 divide-y divide-slate-700">{order.items.map(i=><div className="flex justify-between gap-3 py-3 text-sm" key={i.id}><span>{i.productName}</span><span>× {i.quantity}</span></div>)}</div></aside></div>
  </main>;
}
