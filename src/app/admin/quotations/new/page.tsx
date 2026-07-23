import Link from "next/link";
import { AdminPage, Panel, buttonClass, inputClass, secondaryButtonClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { createManualQuotation } from "@/domain/quotations/actions";
import { prisma } from "@/lib/prisma";

export default async function NewManualQuotation() {
  const context = await requirePermission("quotations.manage");
  const procurementOfficers = await prisma.user.findMany({
    where: { status: "ACTIVE", deletedAt: null, roles: { some: { role: { slug: "procurement-officer" } } } },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });
  const officers = procurementOfficers.length ? procurementOfficers : [{ id: context.user.id, name: context.user.name, email: context.user.email, phone: null }];
  return <AdminPage title="Create manual quotation" description="Capture an assisted, email or offline request. Saving creates a tracked draft for review—it does not bypass approval." actions={<Link className={secondaryButtonClass} href="/admin/quotations">Cancel</Link>}>
    <form action={createManualQuotation} className="space-y-4">
      <Panel title="Quotation contact" description="Innozanzi company details, support@innozanzi.co.za, 071 238 4185 and seven-day validity are applied automatically."><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-semibold">Customer name<input className={`${inputClass} mt-1 w-full`} name="contactName" required/></label><label className="text-sm font-semibold">Customer email<input className={`${inputClass} mt-1 w-full`} name="email" type="email" required/></label><label className="text-sm font-semibold">Procurement officer<select className={`${inputClass} mt-1 w-full`} name="procurementOfficerId" defaultValue={officers.find(officer=>officer.id===context.user.id)?.id??officers[0].id} required>{officers.map(officer=><option value={officer.id} key={officer.id}>{officer.name??officer.email}{officer.phone?` · ${officer.phone}`:""}</option>)}</select></label><label className="text-sm font-semibold sm:col-span-3">Customer requirements or notes<textarea className={`${inputClass} mt-1 min-h-20 w-full`} name="requirements"/></label></div></Panel>
      <Panel title="Quotation lines" description="Enter the agreed customer unit price. Innozanzi is not configured as VAT registered, so VAT is off by default."><div className="space-y-3">{Array.from({length:8},(_,index)=><div className="grid gap-2 border-b border-slate-200 pb-3 sm:grid-cols-[2fr_1fr_90px_130px_100px]" key={index}><input aria-label={`Line ${index+1} description`} className={inputClass} name={`item_${index}_name`} placeholder={`Line ${index+1} description`}/><input aria-label={`Line ${index+1} SKU`} className={inputClass} name={`item_${index}_sku`} placeholder="SKU/reference"/><input aria-label={`Line ${index+1} quantity`} className={inputClass} name={`item_${index}_quantity`} type="number" min="1" defaultValue={index===0?"1":undefined} placeholder="Qty"/><input aria-label={`Line ${index+1} unit price`} className={inputClass} name={`item_${index}_price`} type="number" min="0.01" step="0.01" placeholder="Unit price"/><label className="flex min-h-10 items-center gap-2 text-sm"><input name={`item_${index}_taxable`} type="checkbox"/>Add VAT</label></div>)}</div></Panel>
      <div className="sticky bottom-0 flex items-center justify-between gap-3 border border-slate-300 bg-white p-4 shadow-lg"><p className="text-sm text-slate-600">The quotation is saved as <strong>Manual · Pending approval</strong>.</p><button className={buttonClass}>Save manual quotation</button></div>
    </form>
  </AdminPage>;
}
