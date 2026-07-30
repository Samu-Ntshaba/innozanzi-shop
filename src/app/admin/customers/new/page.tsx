import Link from "next/link";
import { AdminPage, Panel, buttonClass, inputClass, secondaryButtonClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { createCustomer } from "@/domain/crm/actions";
import { getCrmCustomFields } from "@/domain/crm/custom-fields";

export default async function NewCustomerPage() {
  await requirePermission("customers.manage");
  const fields = await getCrmCustomFields();
  return <AdminPage title="Add customer" description="Create a CRM record without requiring the customer to register or activate an online account." actions={<Link className={secondaryButtonClass} href="/admin/customers">Cancel</Link>}>
    <form action={createCustomer} className="space-y-4">
      <Panel title="Customer details"><div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">First name<input className={`${inputClass} mt-1 w-full`} name="firstName" /></label>
        <label className="text-sm font-semibold">Last name<input className={`${inputClass} mt-1 w-full`} name="lastName" /></label>
        <label className="text-sm font-semibold">Email <span className="font-normal text-slate-500">(optional)</span><input className={`${inputClass} mt-1 w-full`} name="email" type="email" /></label>
        <label className="text-sm font-semibold">Phone<input className={`${inputClass} mt-1 w-full`} name="phone" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Company<input className={`${inputClass} mt-1 w-full`} name="companyName" /></label>
      </div></Panel>
      {fields.length ? <Panel title="Custom CRM fields"><div className="grid gap-3 sm:grid-cols-2">{fields.map((field) => <label className="text-sm font-semibold" key={field.id}>{field.label}<input className={`${inputClass} mt-1 w-full`} name={`custom:${field.key}`} /></label>)}</div></Panel> : null}
      <div className="flex justify-end"><button className={buttonClass}>Create customer</button></div>
    </form>
  </AdminPage>;
}
