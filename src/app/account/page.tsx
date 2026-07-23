import Link from "next/link";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AccountPage() {
  const { user } = await requireUser();
  const [quotes, activeOrders, tickets, recentQuotes, recentOrders] = await Promise.all([
    prisma.quotation.count({ where: { customerId: user.id, status: { notIn: ["CANCELLED", "REJECTED", "EXPIRED", "CONVERTED"] } } }),
    prisma.order.count({ where: { userId: user.id, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.helpDeskTicket.count({ where: { OR: [{ customerId: user.id }, { customerId: null, email: { equals: user.email, mode: "insensitive" } }], status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    prisma.quotation.findMany({ where: { customerId: user.id }, select: { id: true, quotationNumber: true, kind: true, status: true, grandTotal: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 3 }),
    prisma.order.findMany({ where: { userId: user.id }, select: { orderNumber: true, status: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 3 }),
  ]);
  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9">
      <section className="overflow-hidden rounded-2xl bg-[#071b33] px-5 py-7 text-white sm:px-8 sm:py-9">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-300">Your technology workspace</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-5">
          <div><h1 className="text-2xl font-black sm:text-3xl">Welcome back, {user.name?.split(" ")[0] ?? "there"}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Request technology, approve quotations, submit payment documents and follow delivery—all in one clear place.</p></div>
          <Link className="rounded-lg bg-sky-500 px-5 py-3 text-sm font-bold text-white hover:bg-sky-400" href="/shop">Request a quotation</Link>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-3 gap-2 sm:gap-4">
        <Metric label="Active quotations" value={quotes} href="/account/quotations"/>
        <Metric label="Orders in progress" value={activeOrders} href="/account/orders"/>
        <Metric label="Open support tickets" value={tickets} href="/account/support"/>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-xl border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="font-bold">Recent activity</h2><p className="text-xs text-slate-500">Your latest quotations and orders</p></div></header>
          <div className="divide-y">
            {recentQuotes.map((quote) => <Link className="grid gap-1 px-4 py-3 hover:bg-sky-50 sm:grid-cols-[1fr_auto] sm:items-center" href="/account/quotations" key={quote.id}><div><p className="text-sm font-bold">{quote.quotationNumber}</p><p className="text-xs text-slate-500">{quote.kind.toLowerCase()} quotation · Updated {quote.updatedAt.toLocaleDateString("en-ZA")}</p></div><Status value={quote.status}/></Link>)}
            {recentOrders.map((order) => <Link className="grid gap-1 px-4 py-3 hover:bg-sky-50 sm:grid-cols-[1fr_auto] sm:items-center" href={`/account/orders/${order.orderNumber}`} key={order.orderNumber}><div><p className="text-sm font-bold">{order.orderNumber}</p><p className="text-xs text-slate-500">Order tracking · Updated {order.updatedAt.toLocaleDateString("en-ZA")}</p></div><Status value={order.status}/></Link>)}
            {!recentQuotes.length && !recentOrders.length ? <div className="px-5 py-10 text-center"><p className="font-semibold">Your workspace is ready</p><p className="mt-1 text-sm text-slate-500">Your quotation and delivery activity will appear here.</p></div> : null}
          </div>
        </section>
        <aside className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-[.14em] text-slate-500">Quick actions</h2>
          <Action href="/shop" title="Find business technology" detail="Select products and quantities"/>
          <Action href="/account/quotations" title="Review quotations" detail="PDFs, status and proof of payment"/>
          <Action href="/contact" title="Ask for expert help" detail="Start a tracked support conversation"/>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">We stay with you after delivery</p><p className="mt-1 text-xs leading-5 text-emerald-800">Contact support for setup, deployment or ongoing ICT assistance.</p></div>
        </aside>
      </div>
    </main>
  );
}

function Metric({ label, value, href }: { label: string; value: number; href: string }) {
  return <Link className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-sky-300 sm:p-5" href={href}><p className="text-xl font-black tabular-nums sm:text-3xl">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">{label}</p></Link>;
}
function Status({ value }: { value: string }) {
  return <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-700">{value.replaceAll("_", " ")}</span>;
}
function Action({ href, title, detail }: { href: string; title: string; detail: string }) {
  return <Link className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-sky-300 hover:shadow-sm" href={href}><p className="text-sm font-bold">{title} <span className="float-right text-sky-700">→</span></p><p className="mt-1 text-xs text-slate-500">{detail}</p></Link>;
}
