import Link from "next/link";
import { AdminPage, Panel, inputClass, buttonClass, tableClass } from "@/components/admin/admin-ui";
import { createDistributor } from "@/domain/suppliers/actions";
import { getAdminSuppliers } from "@/domain/admin/queries";
import { requirePermission } from "@/domain/auth/session";

const Field=({name,label,type="text"}:{name:string;label:string;type?:string})=><label className="text-sm font-semibold">{label}<input className={`${inputClass} mt-1 w-full`} name={name} type={type} required/></label>;

export default async function Page(){
  await requirePermission("products.update");const rows=await getAdminSuppliers();
  return <AdminPage title="Distributors" description="Distributor business details, procurement contacts, commercial terms and private supporting documents.">
    <Panel title="Add distributor" description="Required fields ensure that procurement and accounts teams have a complete operational record.">
      <form action={createDistributor} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field name="companyName" label="Registered company name"/>
        <Field name="registrationNo" label="Registration number"/>
        <Field name="vatNo" label="VAT number"/>
        <Field name="contactPerson" label="Primary contact"/>
        <Field name="email" label="General email" type="email"/>
        <Field name="phone" label="General telephone" type="tel"/>
        <Field name="accountsContact" label="Accounts contact"/>
        <Field name="accountsEmail" label="Accounts email" type="email"/>
        <Field name="accountsPhone" label="Accounts telephone" type="tel"/>
        <Field name="website" label="Website" type="url"/>
        <Field name="accountNumber" label="Our account number"/>
        <Field name="resellerId" label="Reseller ID"/>
        <Field name="creditLimit" label="Credit limit (R)" type="number"/>
        <label className="text-sm font-semibold md:col-span-2">Primary physical address<textarea className={`${inputClass} mt-1 min-h-24 w-full`} name="physicalAddress" required/></label>
        <label className="text-sm font-semibold">Additional branch address<textarea className={`${inputClass} mt-1 min-h-24 w-full`} name="branchAddress"/></label>
        <label className="text-sm font-semibold md:col-span-2 xl:col-span-3">Payment and account terms<textarea className={`${inputClass} mt-1 min-h-28 w-full`} name="paymentTerms" required/></label>
        <label className="text-sm font-semibold md:col-span-2 xl:col-span-3">Internal notes<textarea className={`${inputClass} mt-1 min-h-24 w-full`} name="notes"/></label>
        <button className={`${buttonClass} md:col-span-2 xl:col-span-3`}>Create distributor</button>
      </form>
    </Panel>
    <Panel title="Distributor directory">
      <table className={tableClass}><thead><tr><th>Distributor</th><th>Registration</th><th>Primary contact</th><th>Accounts</th><th>Documents</th><th>Status</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><Link className="font-bold text-sky-700" href={`/admin/suppliers/${x.id}`}>{x.companyName}</Link></td><td>{x.registrationNo??"—"}<br/><span className="text-xs text-slate-500">VAT {x.vatNo??"—"}</span></td><td>{x.contactPerson??"—"}<br/><span className="text-xs">{x.email??x.phone??"—"}</span></td><td>{x.accountsContact??"—"}<br/><span className="text-xs">{x.accountsEmail??"—"}</span></td><td>{x._count.documents}</td><td>{x.isActive?"ACTIVE":"INACTIVE"}</td></tr>)}</tbody></table>
    </Panel>
  </AdminPage>;
}
