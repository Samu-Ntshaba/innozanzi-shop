import Link from "next/link";
import { AdminPage, Panel, StatusBadge, tableClass } from "@/components/admin/admin-ui";
import { getAdminOrders } from "@/domain/admin/queries";
import { requirePermission } from "@/domain/auth/session";

export default async function Page() {
  await requirePermission("orders.view");
  const rows = await getAdminOrders();
  return <AdminPage title="Order fulfilment" description="Orders appear only after payment verification. Open an order to publish controlled fulfilment updates.">
    <Panel className="p-0"><table className={tableClass}><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Fulfilment</th><th>Action</th></tr></thead><tbody>{rows.map((order) => <tr key={order.id}>
      <td><strong>{order.orderNumber}</strong><br/><span className="text-xs text-slate-500">{order.createdAt.toLocaleDateString("en-ZA")}</span></td>
      <td>{order.email}</td><td>R {order.grandTotal.toString()}</td><td><StatusBadge value={order.paymentStatus}/></td><td><StatusBadge value={order.status}/></td>
      <td><Link className="font-semibold text-sky-700" href={`/admin/orders/${order.id}`}>Open fulfilment record →</Link></td>
    </tr>)}</tbody></table></Panel>
  </AdminPage>;
}
