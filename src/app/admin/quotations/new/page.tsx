import Link from "next/link";
import { AdminPage, Panel, buttonClass, inputClass, secondaryButtonClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { createManualQuotation } from "@/domain/quotations/actions";
import { DynamicLineItems } from "@/components/admin/dynamic-line-items";

export default async function NewManualQuotation(){
  await requirePermission("quotations.manage");
  return <AdminPage title="New quotation" description="For telephone, email, WhatsApp and walk-in customers. Existing customers are matched by email; new customers are created automatically." actions={<Link className={secondaryButtonClass} href="/admin/quotations">Cancel</Link>}>
    <form action={createManualQuotation} className="mx-auto max-w-5xl space-y-4">
      <Panel title="Customer" description="Only the details needed to identify the customer and deliver quotation updates."><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Name<input className={`${inputClass} mt-1 w-full`} name="contactName" required/></label><label className="text-sm font-semibold">Email<input className={`${inputClass} mt-1 w-full`} name="email" type="email" required/></label><label className="text-sm font-semibold">Phone <span className="font-normal text-slate-500">(optional)</span><input className={`${inputClass} mt-1 w-full`} name="phone" type="tel"/></label><label className="text-sm font-semibold">Company <span className="font-normal text-slate-500">(optional)</span><input className={`${inputClass} mt-1 w-full`} name="companyName"/></label></div></Panel>
      <Panel title="Products or services" description="Enter the customer-approved quantity and provisional selling price. Innozanzi VAT is not added."><DynamicLineItems kind="quotation" maxRows={8}/></Panel>
      <Panel title="Notes" description="Record only information the sales reviewer needs."><textarea className={`${inputClass} min-h-24 w-full py-3`} name="requirements" placeholder="Delivery requirements, specifications or customer deadline"/></Panel>
      <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white p-4 shadow-lg"><p className="text-sm text-slate-600">Creates or links the customer, saves the quote, and emails acknowledgement.</p><button className={buttonClass}>Create quotation</button></div>
    </form>
  </AdminPage>;
}
