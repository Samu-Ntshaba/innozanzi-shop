import Link from "next/link";
import { AdminPage, Panel, StatusBadge, inputClass, secondaryButtonClass, tableClass } from "@/components/admin/admin-ui";
import { getAdminOrders } from "@/domain/admin/queries";
import { requirePermission } from "@/domain/auth/session";
import { currentOperationalTime } from "@/domain/orders/lifecycle";
import { prisma } from "@/lib/prisma";

export default async function Page({searchParams}:{searchParams:Promise<{supplier?:string}>}) {
  await requirePermission("orders.view");
  const selectedSupplier=(await searchParams).supplier;
  const [rows,suppliers]=await Promise.all([getAdminOrders(selectedSupplier),prisma.supplier.findMany({where:{deletedAt:null,isActive:true},select:{id:true,companyName:true},orderBy:{companyName:"asc"}})]);
  const supplierNames=new Map(suppliers.map(supplier=>[supplier.id,supplier.companyName]));
  const now=currentOperationalTime(),ordered=[...rows].sort((a,b)=>Number(b.status==="PAYMENT_VERIFIED")-Number(a.status==="PAYMENT_VERIFIED")||b.createdAt.getTime()-a.createdAt.getTime());
  return <AdminPage title="Order fulfilment" description="Orders appear only after payment verification. Open an order to publish controlled fulfilment updates.">
    <Panel><form className="flex flex-wrap gap-2"><select className={`${inputClass} min-w-64`} name="supplier" defaultValue={selectedSupplier}><option value="">All distributors and local stock</option>{suppliers.map(supplier=><option key={supplier.id} value={supplier.id}>{supplier.companyName}</option>)}</select><button className={secondaryButtonClass}>Filter orders</button>{selectedSupplier?<Link className={secondaryButtonClass} href="/admin/orders">Clear</Link>:null}</form></Panel>
    <Panel className="p-0"><table className={tableClass}><thead><tr><th>Order</th><th>Customer</th><th>Distributor(s)</th><th>Total</th><th>Payment</th><th>Fulfilment</th><th>Action</th></tr></thead><tbody>{ordered.map((order) => {const minutes=Math.floor((now-(order.payments[0]?.paidAt??order.updatedAt).getTime())/60_000),waiting=order.status==="PAYMENT_VERIFIED",overdue=waiting&&minutes>=30,sources=[...new Set(order.items.map(item=>item.supplierId).filter((id):id is string=>Boolean(id)).map(id=>supplierNames.get(id)??"Unknown distributor"))];return <tr className={overdue?"bg-red-50":waiting?"bg-amber-50":""} key={order.id}>
      <td><strong>{order.orderNumber}</strong><br/><span className="text-xs text-slate-500">{order.createdAt.toLocaleDateString("en-ZA")}</span>{waiting?<span className={`mt-1 block text-xs font-bold ${overdue?"text-red-700":"text-amber-700"}`}>{overdue?`OVERDUE · waiting ${minutes} min`:`Accept within ${Math.max(0,30-minutes)} min`}</span>:null}</td>
      <td>{order.email}</td><td>{sources.length?sources.join(", "):"Innozanzi stock"}{sources.length>1?<small className="block font-bold text-amber-700">Mixed distributor order</small>:null}</td><td>R {order.grandTotal.toString()}</td><td><StatusBadge value={order.paymentStatus}/></td><td><StatusBadge value={order.status}/></td>
      <td><Link className="font-semibold text-sky-700" href={`/admin/orders/${order.id}`}>Open fulfilment record →</Link></td>
    </tr>})}</tbody></table></Panel>
  </AdminPage>;
}
