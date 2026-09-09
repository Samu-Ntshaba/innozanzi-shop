import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/domain/auth/session";
import { formatZar } from "@/lib/money";

export default async function CustomerOrders() {
  const context = await requireUser();
  const orders = await prisma.order.findMany({ where: { userId: context.user.id }, include: { _count: { select: { items: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10"><div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Customer account</p><h1 className="mt-2 text-3xl font-black">Your orders</h1><p className="mt-2 text-slate-600">Complete unpaid orders and track verified orders through delivery.</p></div><Link className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-5 py-3 font-bold sm:w-auto" href="/account">Account overview</Link></div>
    <div className="mt-6 space-y-3 sm:mt-7">{orders.map((order) => <Link className="grid min-w-0 gap-3 rounded-xl border bg-white p-4 shadow-sm hover:border-sky-400 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:p-5" href={`/account/orders/${order.orderNumber}`} key={order.id}><div className="min-w-0"><strong className="break-all sm:break-words">{order.orderNumber}</strong><p className="mt-1 text-sm text-slate-500">{order._count.items} item(s) · Created {order.createdAt.toLocaleDateString("en-ZA")}</p></div><span className="text-sm font-bold">{order.status === "AWAITING_PAYMENT" ? order.paymentStatus === "CANCELLED" ? "Payment cancelled · Retry" : order.paymentStatus === "FAILED" ? "Payment failed · Retry" : "Payment required" : order.status.replaceAll("_", " ")}</span><span className="font-black">{formatZar(order.grandTotal.toString())}</span></Link>)}{!orders.length ? <div className="rounded-xl border border-dashed p-6 text-center sm:p-10"><h2 className="text-xl font-semibold">No orders yet</h2><p className="mt-2 text-sm text-slate-600">Orders created at checkout will appear here.</p><Link className="mt-5 inline-block font-semibold text-sky-700 underline" href="/shop">Continue shopping</Link></div> : null}</div>
  </main>;
}
