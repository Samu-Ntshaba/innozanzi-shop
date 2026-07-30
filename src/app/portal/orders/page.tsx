import Link from "next/link";
import { requireClientPortal } from "@/domain/client-portal/session";
import { prisma } from "@/lib/prisma";

export default async function PortalOrdersPage(){
  const{context}=await requireClientPortal();
  const orders=await prisma.order.findMany({where:{userId:context.user.id},include:{items:true,shipments:true},orderBy:{createdAt:"desc"}});
  return <div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Purchasing</p><h1 className="mt-1 text-3xl font-semibold">Orders</h1><p className="mt-2 text-sm text-slate-600">View order value, fulfilment progress and delivery information.</p><div className="mt-6 space-y-4">{orders.map(order=><Link className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-400 sm:grid-cols-[1fr_auto_auto]" href={`/portal/orders/${order.orderNumber}`} key={order.id}><div><p className="text-lg font-semibold">{order.orderNumber}</p><p className="mt-1 text-sm text-slate-500">{order.items.length} line item{order.items.length===1?"":"s"} · {order.createdAt.toLocaleDateString("en-ZA")}</p></div><span className="self-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{order.status.replaceAll("_"," ")}</span><strong className="self-center">R {Number(order.grandTotal).toLocaleString("en-ZA",{minimumFractionDigits:2})}</strong></Link>)}{!orders.length?<div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No orders yet. Accepted quotations and placed orders will appear here.</div>:null}</div></div>;
}
