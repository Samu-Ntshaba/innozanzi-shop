import Link from "next/link";
import { AdminPage,Panel,buttonClass,inputClass,secondaryButtonClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { createManualInvoice } from "@/domain/documents/actions";
import { DynamicLineItems } from "@/components/admin/dynamic-line-items";

export default async function NewInvoicePage(){
  await requirePermission("quotations.manage");const due=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
  const field="block text-sm font-semibold text-slate-700";
  return <AdminPage title="Manual invoice" description="Create a standalone invoice only when there is no existing order or quotation to reuse." actions={<Link className={secondaryButtonClass} href="/admin/invoices">Back</Link>}>
    <form action={createManualInvoice} className="mx-auto w-full max-w-6xl space-y-4">
      <Panel title="Customer and billing" description="Enter the customer details exactly as they should appear on the invoice.">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={field}>Customer name<span className="ml-1 text-rose-600">*</span><input className={`${inputClass} mt-1.5 w-full`} name="customerName" autoComplete="name" required/></label>
          <label className={field}>Email address<span className="ml-1 text-rose-600">*</span><input className={`${inputClass} mt-1.5 w-full`} name="customerEmail" type="email" autoComplete="email" required/></label>
          <label className={field}>Company name <span className="font-normal text-slate-400">(optional)</span><input className={`${inputClass} mt-1.5 w-full`} name="companyName" autoComplete="organization"/></label>
          <label className={field}>Payment due date<span className="ml-1 text-rose-600">*</span><input className={`${inputClass} mt-1.5 w-full`} name="dueAt" type="date" defaultValue={due} required/></label>
          <label className={`${field} md:col-span-2`}>Billing address<span className="ml-1 text-rose-600">*</span><textarea className={`${inputClass} mt-1.5 min-h-24 w-full resize-y`} name="billingAddress" autoComplete="street-address" placeholder="Street address, suburb, city, province and postal code" required/></label>
        </div>
      </Panel>
      <Panel title="Invoice items" description="Add only the required lines. SKU is intentionally excluded from customer documents."><DynamicLineItems kind="invoice"/></Panel>
      <Panel title="Additional information" description="Optional wording that should appear on the invoice."><label className={field}>Invoice notes<textarea className={`${inputClass} mt-1.5 min-h-24 w-full resize-y`} name="notes" placeholder="Payment terms, customer reference or other relevant information"/></label></Panel>
      <div className="sticky bottom-3 z-10 flex flex-col gap-3 border border-slate-300 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-600">The invoice will be saved as a draft for review.</p><button className={`${buttonClass} w-full sm:w-auto`}>Save draft invoice</button></div>
    </form>
  </AdminPage>;
}
