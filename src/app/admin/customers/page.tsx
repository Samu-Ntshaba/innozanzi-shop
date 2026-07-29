import Link from "next/link";
import { AdminPage, Panel, StatusBadge, buttonClass, inputClass, secondaryButtonClass, tableClass } from "@/components/admin/admin-ui";
import { createCustomField } from "@/domain/crm/actions";
import { getAdminCustomers } from "@/domain/admin/queries";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ imported?: string; skipped?: string }> }) {
  await requirePermission("customers.manage");
  const [rows, fields, params] = await Promise.all([getAdminCustomers(), prisma.crmCustomField.findMany({ orderBy: { createdAt: "asc" } }), searchParams]);
  return <AdminPage title="Customer CRM" description="Manage registered, manually captured, and imported customers in one workspace."
    actions={<><Link className={secondaryButtonClass} href="/admin/customers/import">Bulk import</Link><Link className={buttonClass} href="/admin/customers/new">Add customer</Link></>}>
    {params.imported ? <div className="border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Imported {params.imported} customer(s). {params.skipped !== "0" ? `${params.skipped} row(s) were skipped because they were incomplete, invalid, or duplicates.` : ""}</div> : null}
    <Panel title="CRM columns" description="Add fields that are unique to your sales process. New columns are available for manual entry, customer editing, and import mapping.">
      <div className="flex flex-wrap items-center gap-2">
        {fields.map((field) => <span className="border border-slate-300 bg-slate-50 px-2 py-1 text-xs" key={field.id}>{field.label}</span>)}
        <form action={createCustomField} className="flex gap-2">
          <input className={inputClass} name="label" placeholder="New column name" required />
          <button className={secondaryButtonClass}>Add column</button>
        </form>
      </div>
    </Panel>
    <Panel title="All customers" description={`${rows.length} customer records from every source.`}>
      <table className={tableClass}><thead><tr><th>Customer</th><th>Email</th><th>Company</th><th>Source</th><th>Status</th><th>Orders</th><th>Notes</th><th>Added</th></tr></thead>
        <tbody>{rows.map((customer) => {
          const profileName = [customer.customerProfile?.firstName, customer.customerProfile?.lastName].filter(Boolean).join(" ");
          const hiddenEmail = customer.email.endsWith("@internal.invalid");
          return <tr key={customer.id}>
            <td><Link className="font-semibold text-sky-700 hover:underline" href={`/admin/customers/${customer.id}`}>{customer.name ?? (profileName || customer.customerProfile?.company?.companyName || "Unnamed customer")}</Link></td>
            <td>{hiddenEmail ? "—" : customer.email}</td><td>{customer.customerProfile?.company?.companyName ?? "—"}</td>
            <td>{customer.customerProfile?.source ?? "WEBSITE"}</td><td><StatusBadge value={customer.deletedAt ? "DISABLED" : customer.email.endsWith("@internal.invalid") ? "CRM_ONLY" : customer.status} /></td>
            <td>{customer._count.orders}</td><td>{customer.customerProfile?._count.notes ?? 0}</td><td>{customer.createdAt.toLocaleDateString("en-ZA")}</td>
          </tr>;
        })}</tbody>
      </table>
    </Panel>
  </AdminPage>;
}
