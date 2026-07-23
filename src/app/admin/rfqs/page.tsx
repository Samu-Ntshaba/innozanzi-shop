import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/domain/auth/session";
import { createRfq } from "@/domain/rfq/actions";
import { AdminPage, Panel, StatusBadge, buttonClass, inputClass, tableClass } from "@/components/admin/admin-ui";

export default async function RfqsPage() {
  const context = await requirePermission("rfq.view");
  const scope = !context.isSuperAdministrator && context.user.companyId ? { companyId: context.user.companyId } : {};
  const rfqs = await prisma.rfqOpportunity.findMany({ where: scope, orderBy: { updatedAt: "desc" }, take: 100 });
  const stats = [
    ["Open", rfqs.filter((rfq) => !["LOST", "CANCELLED", "EXPIRED", "COMPLETED"].includes(rfq.status)).length],
    ["Awaiting approval", rfqs.filter((rfq) => rfq.status === "AWAITING_APPROVAL").length],
    ["Submitted", rfqs.filter((rfq) => rfq.status === "SUBMITTED").length],
    ["Won", rfqs.filter((rfq) => rfq.status === "WON" || rfq.status === "COMPLETED").length],
  ] as const;
  return <AdminPage title="RFQs & tenders" description="Capture opportunities, review AI extraction, build pricing and control approvals.">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value], index) => <div className="relative overflow-hidden border border-slate-300 bg-white p-4 shadow-sm" key={label}><div className={`absolute inset-x-0 top-0 h-1 ${index === 1 ? "bg-amber-400" : index === 2 ? "bg-sky-500" : index === 3 ? "bg-emerald-500" : "bg-slate-700"}`} /><p className="text-[11px] font-bold uppercase tracking-[.14em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">Current pipeline</p></div>)}</div>
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-slate-700 bg-[#172b3a] px-5 py-5 text-white sm:px-6"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-sky-300">New opportunity</p><div className="mt-1 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold tracking-tight">Capture an RFQ or tender</h2><p className="mt-1 max-w-2xl text-sm text-slate-300">Start with the commercial facts. You can add source documents and run extraction after the opportunity is created.</p></div><span className="border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200">Step 1 of 3</span></div></div>
      <form action={createRfq} className="grid gap-x-5 gap-y-4 p-5 sm:p-6 md:grid-cols-2">
        <div className="md:col-span-2"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Opportunity details</p><p className="mt-1 text-sm text-slate-600">Required fields are marked with <span className="text-rose-600">*</span>.</p></div>
        <label className="text-sm font-semibold text-slate-800 md:col-span-2">Opportunity title <span className="text-rose-600">*</span><input className={`${inputClass} mt-1.5 w-full`} name="title" placeholder="e.g. Office furniture supply and installation" required /></label>
        <label className="text-sm font-semibold text-slate-800">Issuing organisation <span className="text-rose-600">*</span><input className={`${inputClass} mt-1.5 w-full`} name="issuingOrganisation" placeholder="e.g. Department of Public Works" required /></label>
        <label className="text-sm font-semibold text-slate-800">Opportunity type <select className={`${inputClass} mt-1.5 w-full`} name="type">{["RFQ","TENDER","RFP","RFI","OTHER"].map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-800">External reference <span className="font-normal text-slate-500">(optional)</span><input className={`${inputClass} mt-1.5 w-full`} name="externalReference" placeholder="Client or portal reference" /></label>
        <label className="text-sm font-semibold text-slate-800">Closing date <span className="font-normal text-slate-500">(optional)</span><input className={`${inputClass} mt-1.5 w-full`} name="closingAt" type="datetime-local" /></label>
        <label className="text-sm font-semibold text-slate-800 md:col-span-2">Brief description <span className="font-normal text-slate-500">(optional)</span><textarea className={`${inputClass} mt-1.5 min-h-28 w-full resize-y`} name="description" placeholder="What is the client asking you to supply or deliver?" /></label>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 md:col-span-2"><p className="text-xs text-slate-500">You can enrich this record with documents, links, requirements and pricing next.</p><button className={`${buttonClass} inline-flex items-center gap-2 px-5 py-2.5`}><span aria-hidden="true">+</span> Create opportunity</button></div>
      </form>
    </Panel>
    <Panel className="overflow-hidden p-0"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-sky-700">Opportunity register</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Recent RFQs and tenders</h2></div><p className="text-xs text-slate-500">Showing the 100 most recently updated</p></div><table className={tableClass}><thead><tr><th>Reference</th><th>Opportunity</th><th>Organisation</th><th>Closing</th><th>Status</th><th>Total</th></tr></thead><tbody>
      {rfqs.map((rfq) => <tr key={rfq.id}><td><Link className="font-semibold text-sky-700" href={`/admin/rfqs/${rfq.id}`}>{rfq.referenceNumber}</Link></td><td>{rfq.title}<br/><span className="text-xs text-slate-500">{rfq.type}</span></td><td>{rfq.issuingOrganisation}</td><td>{rfq.closingAt?.toLocaleString("en-ZA") ?? "Not set"}</td><td><StatusBadge value={rfq.status}/></td><td>R {Number(rfq.sellingIncludingVat).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td></tr>)}
      {!rfqs.length ? <tr><td colSpan={6} className="text-center text-slate-500">No RFQs have been created.</td></tr> : null}
    </tbody></table></Panel>
  </AdminPage>;
}
