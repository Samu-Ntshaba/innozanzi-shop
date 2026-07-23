import Link from "next/link";
import { AdminPage,Panel,buttonClass,inputClass,secondaryButtonClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { createManualInvoice } from "@/domain/documents/actions";

export default async function NewInvoicePage(){
  await requirePermission("quotations.manage");const due=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
  return <AdminPage title="Manual invoice" description="Create a standalone invoice only when there is no existing order or quotation to reuse." actions={<Link className={secondaryButtonClass} href="/admin/invoices">Back</Link>}><Panel><form action={createManualInvoice} className="grid gap-4 sm:grid-cols-2">
    <label>Customer name<input className={inputClass} name="customerName" required/></label><label>Email<input className={inputClass} name="customerEmail" type="email" required/></label><label>Company<input className={inputClass} name="companyName"/></label><label>Due date<input className={inputClass} name="dueAt" type="date" defaultValue={due} required/></label><label className="sm:col-span-2">Billing address<textarea className={`${inputClass} min-h-20`} name="billingAddress" required/></label>
    <div className="sm:col-span-2"><h2 className="font-bold">Invoice items</h2><p className="text-sm text-slate-500">SKU is intentionally excluded from customer invoices.</p></div>
    {Array.from({length:6},(_,i)=><div className="grid gap-2 border border-slate-200 p-3 sm:col-span-2 sm:grid-cols-[1fr_100px_150px_100px]" key={i}><input className={inputClass} name={`description_${i}`} placeholder={`Item ${i+1} description`} required={i===0}/><input className={inputClass} name={`quantity_${i}`} type="number" min="1" defaultValue={i===0?1:undefined} placeholder="Qty"/><input className={inputClass} name={`unitPrice_${i}`} type="number" min="0" step=".01" placeholder="Unit price"/><input className={inputClass} name={`vatRate_${i}`} type="number" min="0" max="100" step=".01" defaultValue={i===0?15:undefined} placeholder="VAT %"/></div>)}
    <label className="sm:col-span-2">Notes<textarea className={`${inputClass} min-h-20`} name="notes"/></label><button className={`${buttonClass} sm:col-span-2`}>Save draft invoice</button>
  </form></Panel></AdminPage>;
}
