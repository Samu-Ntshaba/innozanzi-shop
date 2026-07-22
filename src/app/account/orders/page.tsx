import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/domain/auth/session";
import { formatZar } from "@/lib/money";

export default async function CustomerOrders() {
  const context = await requireUser();
  const orders = await prisma.order.findMany({ where: { userId: context.user.id }, include: { _count: { select: { items: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return <main className="mx-auto max-w-6xl px-4 py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Customer account</p><h1 className="mt-2 text-3xl font-black">Your orders</h1><p className="mt-2 text-slate-600">Track paid orders from verification through delivery and completion.</p></div><Link className="rounded-lg border px-5 py-3 font-bold" href="/account">Account overview</Link></div>
    <div className="mt-7 space-y-3">{orders.map((order) => <Link className="grid gap-3 rounded-xl border bg-white p-5 shadow-sm hover:border-sky-400 sm:grid-cols-[1fr_auto_auto] sm:items-center" href={`/account/orders/${order.orderNumber}`} key={order.id}><div><strong>{order.orderNumber}</strong><p className="mt-1 text-sm text-slate-500">{order._count.items} item(s) · Created {order.createdAt.toLocaleDateString("en-ZA")}</p></div><span className="text-sm font-bold">{order.status.replaceAll("_", " ")}</span><span className="font-black">{formatZar(order.grandTotal.toString())}</span></Link>)}{!orders.length ? <div className="rounded-xl border border-dashed p-10 text-center"><h2 className="text-xl font-semibold">No active orders yet</h2><p className="mt-2 text-sm text-slate-600">An order appears here after your final quotation payment is verified.</p><Link className="mt-5 inline-block font-semibold text-sky-700 underline" href="/account/quotations">View quotations</Link></div> : null}</div>
  </main>;
}
