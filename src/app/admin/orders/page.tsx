import Link from "next/link";
import { AdminPage, Panel, StatusBadge, inputClass, secondaryButtonClass, tableClass } from "@/components/admin/admin-ui";
import { getAdminOrders } from "@/domain/admin/queries";
import { requirePermission } from "@/domain/auth/session";
import { currentOperationalTime } from "@/domain/orders/lifecycle";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/generated/prisma/enums";

const statuses:OrderStatus[]=["PAYMENT_VERIFIED","PROCESSING","SOURCING_ITEMS","ITEMS_RECEIVED","PACKING","READY_FOR_DELIVERY","DISPATCHED","IN_TRANSIT","DELIVERED","COMPLETED","CANCELLED","REFUNDED","PARTIALLY_REFUNDED"];
export default async function Page({searchParams}:{searchParams:Promise<{supplier?:string;status?:string;q?:string}>}) {
  await requirePermission("orders.view");
  const query=await searchParams,selectedSupplier=query.supplier,selectedStatus=statuses.find(status=>status===query.status);
  const [rows,suppliers]=await Promise.all([getAdminOrders(selectedSupplier,selectedStatus,query.q?.trim().slice(0,160)),prisma.supplier.findMany({where:{deletedAt:null,isActive:true},select:{id:true,companyName:true},orderBy:{companyName:"asc"}})]);
  const supplierNames=new Map(suppliers.map(supplier=>[supplier.id,supplier.companyName]));
  const now=currentOperationalTime(),ordered=[...rows].sort((a,b)=>Number(b.status==="PAYMENT_VERIFIED")-Number(a.status==="PAYMENT_VERIFIED")||b.createdAt.getTime()-a.createdAt.getTime());
  return <AdminPage title="Order operations" description="Manage every paid order from acceptance through distributor delivery and completion. Search also finds unpaid orders for payment support.">
    <Panel><form className="flex flex-wrap gap-2"><input className={`${inputClass} min-w-64`} name="q" defaultValue={query.q} maxLength={160} placeholder="Order, customer, payment or tracking reference"/><select className={`${inputClass} min-w-64`} name="supplier" defaultValue={selectedSupplier}><option value="">All distributors and local stock</option>{suppliers.map(supplier=><option key={supplier.id} value={supplier.id}>{supplier.companyName}</option>)}</select><select className={`${inputClass} min-w-52`} name="status" defaultValue={selectedStatus}><option value="">All order stages</option>{statuses.map(status=><option key={status} value={status}>{status.replaceAll("_"," ")}</option>)}</select><button className={secondaryButtonClass}>Filter orders</button>{selectedSupplier||selectedStatus||query.q?<Link className={secondaryButtonClass} href="/admin/orders">Clear</Link>:null}</form></Panel>
    <Panel className="p-0"><table className={tableClass}><thead><tr><th>Order</th><th>Customer</th><th>Distributor(s)</th><th>Total</th><th>Payment</th><th>Fulfilment</th><th>Action</th></tr></thead><tbody>{ordered.map((order) => {const payment=order.payments[0],paymentPending=order.paymentStatus==="PENDING",minutes=Math.floor((now-(payment?.paidAt??order.updatedAt).getTime())/60_000),waiting=order.status==="PAYMENT_VERIFIED",overdue=waiting&&minutes>=30,sources=[...new Set(order.items.map(item=>item.supplierId).filter((id):id is string=>Boolean(id)).map(id=>supplierNames.get(id)??"Unknown distributor"))];return <tr className={paymentPending?"bg-amber-50":overdue?"bg-red-50":waiting?"bg-amber-50":""} key={order.id}>
      <td><strong>{order.orderNumber}</strong><br/><span className="text-xs text-slate-500">{order.createdAt.toLocaleDateString("en-ZA")}</span>{waiting?<span className={`mt-1 block text-xs font-bold ${overdue?"text-red-700":"text-amber-700"}`}>{overdue?`OVERDUE · waiting ${minutes} min`:`Accept within ${Math.max(0,30-minutes)} min`}</span>:null}</td>
      <td>{order.email}</td><td>{sources.length?sources.join(", "):"Innozanzi stock"}{sources.length>1?<small className="block font-bold text-amber-700">Mixed distributor order</small>:null}</td><td>R {order.grandTotal.toString()}</td><td><StatusBadge value={order.paymentStatus}/>{paymentPending?<small className="mt-1 block font-semibold text-amber-800">Payment confirmation pending<br/>{payment?.provider} · {payment?.externalReference??"Reference unavailable"}</small>:null}</td><td>{paymentPending?<span className="text-sm text-slate-500">Not started</span>:<StatusBadge value={order.status}/>}</td>
      <td><Link className="font-semibold text-sky-700" href={`/admin/orders/${order.id}`}>{paymentPending?"Review order":"Open order workspace"} →</Link>{paymentPending?<Link className="mt-1 block text-xs font-semibold text-amber-800 underline" href="/admin/payments">Payment evidence</Link>:null}</td>
    </tr>})}</tbody></table></Panel>
  </AdminPage>;
}
