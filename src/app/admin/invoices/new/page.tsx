import Link from "next/link";
import { AdminPage,Panel,buttonClass,inputClass,secondaryButtonClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { createManualInvoice } from "@/domain/documents/actions";
import { DynamicLineItems } from "@/components/admin/dynamic-line-items";

export default async function NewInvoicePage(){
  await requirePermission("quotations.manage");const due=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
  return <AdminPage title="Manual invoice" description="Create a standalone invoice only when there is no existing order or quotation to reuse." actions={<Link className={secondaryButtonClass} href="/admin/invoices">Back</Link>}><Panel><form action={createManualInvoice} className="grid gap-4 sm:grid-cols-2">
    <label>Customer name<input className={inputClass} name="customerName" required/></label><label>Email<input className={inputClass} name="customerEmail" type="email" required/></label><label>Company<input className={inputClass} name="companyName"/></label><label>Due date<input className={inputClass} name="dueAt" type="date" defaultValue={due} required/></label><label className="sm:col-span-2">Billing address<textarea className={`${inputClass} min-h-20`} name="billingAddress" required/></label>
    <div className="sm:col-span-2"><h2 className="font-bold">Invoice items</h2><p className="text-sm text-slate-500">Add only the required lines. SKU is intentionally excluded.</p></div><div className="sm:col-span-2"><DynamicLineItems kind="invoice"/></div>
    <label className="sm:col-span-2">Notes<textarea className={`${inputClass} min-h-20`} name="notes"/></label><button className={`${buttonClass} sm:col-span-2`}>Save draft invoice</button>
  </form></Panel></AdminPage>;
}
