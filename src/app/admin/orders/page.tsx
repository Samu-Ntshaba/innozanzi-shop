import Link from "next/link";
import { AdminPage, Panel, StatusBadge, tableClass } from "@/components/admin/admin-ui";
import { getAdminOrders } from "@/domain/admin/queries";
import { requirePermission } from "@/domain/auth/session";
import { currentOperationalTime } from "@/domain/orders/lifecycle";

export default async function Page() {
  await requirePermission("orders.view");
  const rows = await getAdminOrders();
  const now=currentOperationalTime(),ordered=[...rows].sort((a,b)=>Number(b.status==="PAYMENT_VERIFIED")-Number(a.status==="PAYMENT_VERIFIED")||b.createdAt.getTime()-a.createdAt.getTime());
  return <AdminPage title="Order fulfilment" description="Orders appear only after payment verification. Open an order to publish controlled fulfilment updates.">
    <Panel className="p-0"><table className={tableClass}><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Fulfilment</th><th>Action</th></tr></thead><tbody>{ordered.map((order) => {const minutes=Math.floor((now-(order.payments[0]?.paidAt??order.updatedAt).getTime())/60_000),waiting=order.status==="PAYMENT_VERIFIED",overdue=waiting&&minutes>=30;return <tr className={overdue?"bg-red-50":waiting?"bg-amber-50":""} key={order.id}>
      <td><strong>{order.orderNumber}</strong><br/><span className="text-xs text-slate-500">{order.createdAt.toLocaleDateString("en-ZA")}</span>{waiting?<span className={`mt-1 block text-xs font-bold ${overdue?"text-red-700":"text-amber-700"}`}>{overdue?`OVERDUE · waiting ${minutes} min`:`Accept within ${Math.max(0,30-minutes)} min`}</span>:null}</td>
      <td>{order.email}</td><td>R {order.grandTotal.toString()}</td><td><StatusBadge value={order.paymentStatus}/></td><td><StatusBadge value={order.status}/></td>
      <td><Link className="font-semibold text-sky-700" href={`/admin/orders/${order.id}`}>Open fulfilment record →</Link></td>
    </tr>})}</tbody></table></Panel>
  </AdminPage>;
}
