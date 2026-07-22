import { AdminPage, Panel } from "@/components/admin/admin-ui";
import { getAdminDashboard } from "@/domain/admin/queries";
import { requirePermission } from "@/domain/auth/session";

export default async function AdminDashboard() {
  await requirePermission("reports.view");
  const data = await getAdminDashboard();
  const cards = [["Paid revenue", `R ${Number(data.revenue).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`], ["Orders", data.orders], ["Products", data.products], ["Customers", data.customers], ["Low stock", data.lowStock], ["Proofs to review", data.pendingPayments]];
  return <AdminPage title="Dashboard" description="Live commerce and operational overview."><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value]) => <Panel key={label as string}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p></Panel>)}</div></AdminPage>;
}
