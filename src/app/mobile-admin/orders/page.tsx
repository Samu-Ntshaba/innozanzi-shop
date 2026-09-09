import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Row, Section, Stat, card, money } from "@/components/mobile-admin/ui";

export default async function MobileOrders() {
  const [orders,pendingProof]=await Promise.all([prisma.order.findMany({where:{isTestData:false},orderBy:{createdAt:"desc"},take:50,select:{id:true,orderNumber:true,email:true,phone:true,grandTotal:true,status:true,paymentMethod:true,createdAt:true}}),prisma.paymentProof.count({where:{status:"PENDING"}})]);
  const urgent=orders.filter(order=>["PAID","PAYMENT_VERIFIED"].includes(order.status)).length;
  return <><h1 className="text-3xl font-black text-[#071b33]">Orders</h1><p className="mt-1 text-sm text-slate-500">Accept, review and follow daily fulfilment.</p><div className="mt-5 grid grid-cols-2 gap-3"><Stat label="Ready to accept" value={urgent} tone={urgent?"rose":"green"}/><Stat label="Proofs to verify" value={pendingProof} tone="amber"/></div><div className="mt-4 grid grid-cols-2 gap-3"><Link href="/admin/payments" className="min-h-11 rounded-xl bg-[#0a6ed1] px-4 py-3 text-center text-sm font-bold text-white">Review payments</Link><Link href="/api/admin/reports/sales/csv" className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700">Download CSV</Link></div><Section title="Recent orders"><div className={card}>{orders.map(order=><Row key={order.id} href={`/admin/orders/${order.id}`} title={`${order.orderNumber} · ${money(order.grandTotal)}`} meta={`${order.email} · ${order.paymentMethod} · ${order.createdAt.toLocaleDateString("en-ZA")}`} badge={order.status}/>)}</div></Section></>;
}
