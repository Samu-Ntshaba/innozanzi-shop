import { AdminPage, Panel, tableClass } from "@/components/admin/admin-ui";
import { getAdminCustomers } from "@/domain/admin/queries";
import { requirePermission } from "@/domain/auth/session";

export default async function CustomersPage() {
  await requirePermission("customers.manage");
  const rows = await getAdminCustomers();
  return <AdminPage title="Customers" description="Customer accounts, company profiles and order activity."><Panel><table className={tableClass}><thead><tr><th>Customer</th><th>Email</th><th>Company</th><th>Status</th><th>Orders</th><th>Joined</th></tr></thead><tbody>{rows.map((customer) => {
    const profileName = [customer.customerProfile?.firstName, customer.customerProfile?.lastName].filter(Boolean).join(" ");
    return <tr key={customer.id}><td>{customer.name ?? (profileName || "-")}</td><td>{customer.email}</td><td>{customer.customerProfile?.company?.companyName ?? "-"}</td><td>{customer.status}</td><td>{customer._count.orders}</td><td>{customer.createdAt.toLocaleDateString("en-ZA")}</td></tr>;
  })}</tbody></table></Panel></AdminPage>;
}
