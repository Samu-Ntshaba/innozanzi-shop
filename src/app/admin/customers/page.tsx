import { AdminPage, Panel, tableClass } from "@/components/admin/admin-ui";
import { getAdminCustomers } from "@/domain/admin/queries";
import { requirePermission } from "@/domain/auth/session";
import { deleteUser,restoreUser } from "@/domain/auth/admin-actions";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";

export default async function CustomersPage() {
  const context=await requirePermission("customers.manage");
  const rows = await getAdminCustomers();
  return <AdminPage title="Customers" description="Customer accounts, company profiles and order activity."><Panel><table className={tableClass}><thead><tr><th>Customer</th><th>Email</th><th>Company</th><th>Status</th><th>Orders</th><th>Joined</th>{context.isSuperAdministrator?<th>Action</th>:null}</tr></thead><tbody>{rows.map((customer) => {
    const profileName = [customer.customerProfile?.firstName, customer.customerProfile?.lastName].filter(Boolean).join(" ");
    return <tr className={customer.deletedAt?"bg-slate-100 text-slate-500":undefined} key={customer.id}><td>{customer.name ?? (profileName || "-")}</td><td>{customer.email}</td><td>{customer.customerProfile?.company?.companyName ?? "-"}</td><td>{customer.deletedAt?"DELETED":customer.status}</td><td>{customer._count.orders}</td><td>{customer.createdAt.toLocaleDateString("en-ZA")}</td>{context.isSuperAdministrator?<td>{customer.deletedAt?<form action={restoreUser}><input type="hidden" name="userId" value={customer.id}/><ConfirmActionButton className="font-semibold text-sky-700 underline" label="Restore" message={`Restore ${customer.email}?`}/></form>:customer.id!==context.user.id?<form action={deleteUser}><input type="hidden" name="userId" value={customer.id}/><ConfirmActionButton className="font-semibold text-rose-700 underline" label="Delete" message={`Delete ${customer.email}? Access will be revoked while business history is retained.`}/></form>:<span>Protected</span>}</td>:null}</tr>;
  })}</tbody></table></Panel></AdminPage>;
}
