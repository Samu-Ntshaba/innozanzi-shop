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
    <div className="grid gap-3 sm:grid-cols-4">{stats.map(([label, value]) => <div className="border bg-white p-4" key={label}><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div>
    <Panel><h2 className="mb-4 text-lg font-semibold">Create an opportunity</h2><form action={createRfq} className="grid gap-3 md:grid-cols-3">
      <label className="text-sm font-semibold">Title<input className={`${inputClass} mt-1`} name="title" required /></label>
      <label className="text-sm font-semibold">Issuing organisation<input className={`${inputClass} mt-1`} name="issuingOrganisation" required /></label>
      <label className="text-sm font-semibold">Type<select className={`${inputClass} mt-1`} name="type">{["RFQ","TENDER","RFP","RFI","OTHER"].map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="text-sm font-semibold">External reference<input className={`${inputClass} mt-1`} name="externalReference" /></label>
      <label className="text-sm font-semibold">Closing date<input className={`${inputClass} mt-1`} name="closingAt" type="datetime-local" /></label>
      <label className="text-sm font-semibold md:col-span-3">Description<textarea className={`${inputClass} mt-1 min-h-24`} name="description" /></label>
      <button className={`${buttonClass} md:w-fit`}>Create RFQ</button>
    </form></Panel>
    <Panel className="overflow-x-auto p-0"><table className={tableClass}><thead><tr><th>Reference</th><th>Opportunity</th><th>Organisation</th><th>Closing</th><th>Status</th><th>Total</th></tr></thead><tbody>
      {rfqs.map((rfq) => <tr key={rfq.id}><td><Link className="font-semibold text-sky-700" href={`/admin/rfqs/${rfq.id}`}>{rfq.referenceNumber}</Link></td><td>{rfq.title}<br/><span className="text-xs text-slate-500">{rfq.type}</span></td><td>{rfq.issuingOrganisation}</td><td>{rfq.closingAt?.toLocaleString("en-ZA") ?? "Not set"}</td><td><StatusBadge value={rfq.status}/></td><td>R {Number(rfq.sellingIncludingVat).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td></tr>)}
      {!rfqs.length ? <tr><td colSpan={6} className="text-center text-slate-500">No RFQs have been created.</td></tr> : null}
    </tbody></table></Panel>
  </AdminPage>;
}
