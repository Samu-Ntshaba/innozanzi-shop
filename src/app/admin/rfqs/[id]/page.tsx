import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/domain/auth/session";
import { addRfqTextSource, addRfqUrlSource, analyseRfqSource, confirmRfqAnalysis, decideRfqApproval, saveRfqLineItem, submitRfqForApproval } from "@/domain/rfq/actions";
import { AdminPage, Panel, StatusBadge, buttonClass, inputClass, tableClass } from "@/components/admin/admin-ui";

export default async function RfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission("rfq.view");
  const { id } = await params;
  const rfq = await prisma.rfqOpportunity.findUnique({ where: { id }, include: { sources: { orderBy: { createdAt: "desc" } }, analyses: { orderBy: { createdAt: "desc" } }, requirements: true, lineItems: true, approvals: { orderBy: { createdAt: "desc" } }, statusHistory: { orderBy: { createdAt: "desc" } } } });
  if (!rfq || (!context.isSuperAdministrator && context.user.companyId && rfq.companyId !== context.user.companyId)) notFound();
  const latestAnalysis = rfq.analyses[0];
  const latestApproval = rfq.approvals[0];
  return <AdminPage title={rfq.title} description={`${rfq.referenceNumber} · ${rfq.issuingOrganisation}`}>
    <div className="flex flex-wrap items-center gap-3"><StatusBadge value={rfq.status}/><span className="text-sm text-slate-600">Closing: {rfq.closingAt?.toLocaleString("en-ZA") ?? "not set"}</span></div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel><h2 className="mb-4 text-lg font-semibold">Source content</h2>
        <form action={addRfqTextSource} className="space-y-3"><input type="hidden" name="rfqId" value={rfq.id}/><input className={inputClass} name="label" placeholder="Source label" required/><textarea className={`${inputClass} min-h-32`} name="text" placeholder="Paste tender or RFQ content" required/><button className={buttonClass}>Save text source</button></form>
        <form action={addRfqUrlSource} className="mt-5 grid gap-3 sm:grid-cols-2"><input type="hidden" name="rfqId" value={rfq.id}/><input className={inputClass} name="label" placeholder="Website label" required/><input className={inputClass} name="sourceUrl" placeholder="https://…" type="url" required/><button className={buttonClass}>Import website</button></form>
        <div className="mt-5 space-y-2">{rfq.sources.map((source) => <div className="flex flex-wrap items-center justify-between gap-2 border p-3" key={source.id}><div><strong>{source.label}</strong><p className="text-xs text-slate-500">{source.type} · {source.processingStatus}</p>{source.analysisError ? <p className="text-xs text-red-700">{source.analysisError}</p> : null}</div><form action={analyseRfqSource}><input type="hidden" name="sourceId" value={source.id}/><button className={buttonClass}>Analyse with AI</button></form></div>)}</div>
      </Panel>
      <Panel><h2 className="mb-4 text-lg font-semibold">Human review</h2>
        {latestAnalysis ? <><p className="text-sm text-slate-600">AI confidence: {Number(latestAnalysis.confidence ?? 0) * 100}% — extraction is never accepted automatically.</p><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(latestAnalysis.rawOutput, null, 2)}</pre>{!latestAnalysis.reviewedAt ? <form action={confirmRfqAnalysis} className="mt-3"><input type="hidden" name="analysisId" value={latestAnalysis.id}/><button className={buttonClass}>Confirm extraction</button></form> : <p className="mt-3 text-sm font-semibold text-emerald-700">Confirmed by a reviewer</p>}</> : <p className="text-sm text-slate-500">Add and analyse a source. A person must confirm all extracted data.</p>}
      </Panel>
    </div>
    <Panel><h2 className="mb-4 text-lg font-semibold">Pricing workspace</h2>
      <form action={saveRfqLineItem} className="grid gap-3 md:grid-cols-6"><input type="hidden" name="rfqId" value={rfq.id}/><input className={`${inputClass} md:col-span-2`} name="description" placeholder="Product or service" required/><input className={inputClass} name="quantity" type="number" min="0.01" step="0.01" placeholder="Qty" required/><input className={inputClass} name="unitCost" type="number" min="0" step="0.01" placeholder="Unit cost" required/><select className={inputClass} name="pricingMethod"><option value="MARKUP">Markup</option><option value="MARGIN">Margin</option></select><input className={inputClass} name="pricingPercent" type="number" min="0" max="99.99" step="0.01" placeholder="%" required/><label className="flex items-center gap-2 text-sm"><input name="isService" type="checkbox"/>Service cost</label><button className={buttonClass}>Add pricing line</button></form>
      <div className="mt-5 overflow-x-auto"><table className={tableClass}><thead><tr><th>Description</th><th>Qty</th><th>Cost</th><th>Selling</th><th>Profit</th></tr></thead><tbody>{rfq.lineItems.map((item) => <tr key={item.id}><td>{item.description}</td><td>{Number(item.quantity)}</td><td>R {Number(item.costSubtotal).toFixed(2)}</td><td>R {Number(item.sellingSubtotal).toFixed(2)}</td><td>R {Number(item.profit).toFixed(2)}</td></tr>)}</tbody></table></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">{[["Cost",rfq.totalCostBeforeVat],["Selling incl. VAT",rfq.sellingIncludingVat],["Gross profit",rfq.grossProfit],["Expected profit",rfq.expectedProfit]].map(([label,value]) => <div className="border p-3" key={String(label)}><p className="text-xs font-bold uppercase text-slate-500">{String(label)}</p><p className="text-xl font-semibold">R {Number(value).toFixed(2)}</p></div>)}</div>
      {rfq.status === "PRICING_IN_PROGRESS" ? <form action={submitRfqForApproval} className="mt-4"><input type="hidden" name="rfqId" value={rfq.id}/><button className={buttonClass}>Submit pricing for approval</button></form> : null}
      {rfq.status === "AWAITING_APPROVAL" && latestApproval ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{["APPROVED","REJECTED"].map((decision) => <form action={decideRfqApproval} className="border p-3" key={decision}><input type="hidden" name="rfqId" value={rfq.id}/><input type="hidden" name="approvalId" value={latestApproval.id}/><input type="hidden" name="decision" value={decision}/><textarea className={`${inputClass} mb-2`} name="comments" placeholder="Approval comments"/><button className={buttonClass}>{decision === "APPROVED" ? "Approve" : "Reject"}</button></form>)}</div> : null}
    </Panel>
    <Panel><h2 className="mb-4 text-lg font-semibold">Audit trail</h2><ol className="space-y-2">{rfq.statusHistory.map((event) => <li className="border-l-2 border-sky-600 pl-3 text-sm" key={event.id}><strong>{event.toStatus}</strong> <span className="text-slate-500">{event.createdAt.toLocaleString("en-ZA")}</span>{event.note ? <p>{event.note}</p> : null}</li>)}</ol></Panel>
  </AdminPage>;
}
