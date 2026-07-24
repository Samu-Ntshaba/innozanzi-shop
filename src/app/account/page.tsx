import Link from "next/link";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AccountPage() {
  const { user } = await requireUser();
  const [quotes, activeOrders, tickets] = await Promise.all([
    prisma.quotation.count({ where: { customerId: user.id, status: { notIn: ["CANCELLED", "REJECTED", "EXPIRED", "CONVERTED"] } } }),
    prisma.order.count({ where: { userId: user.id, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.helpDeskTicket.count({ where: { OR: [{ customerId: user.id }, { customerId: null, email: { equals: user.email, mode: "insensitive" } }], status: { notIn: ["RESOLVED", "CLOSED"] } } }),
  ]);
  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9">
      <section className="grid grid-cols-3 gap-2 sm:gap-4">
        <Metric label="Active quotations" value={quotes} href="/account/quotations"/>
        <Metric label="Orders in progress" value={activeOrders} href="/account/orders"/>
        <Metric label="Open support tickets" value={tickets} href="/account/support"/>
      </section>
    </main>
  );
}

function Metric({ label, value, href }: { label: string; value: number; href: string }) {
  return <Link className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-sky-300 sm:p-5" href={href}><p className="text-xl font-black tabular-nums sm:text-3xl">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">{label}</p></Link>;
}
