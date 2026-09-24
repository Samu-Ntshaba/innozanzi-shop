import Link from "next/link";
import { AdminPage, EmptyState, MetricCard, Panel, StatusBadge, buttonClass, tableClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

export default async function SalesCasesPage() {
  await requirePermission("partner_sales.pricing.approve");
  const cases = await prisma.partnerQuoteCase.findMany({
    where: { status: { notIn: ["COMPLETED", "DECLINED", "EXPIRED", "CANCELLED", "REFUNDED"] } },
    select: {
      id: true,
      caseNumber: true,
      status: true,
      updatedAt: true,
      partnerClient: { select: { companyName: true, contactName: true, email: true } },
      profile: { select: { displayName: true } },
      quotationRequest: { select: { requestNumber: true, items: { select: { id: true } } } },
      activeQuotation: { select: { grandTotal: true, validUntil: true, version: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 150,
  });
  const awaiting = cases.filter((item) => ["NEW_ENQUIRY", "QUALIFIED", "PRICING_REQUESTED", "INNOZANZI_REVIEW", "REVISION_REQUESTED"].includes(item.status)).length;
  return (
    <AdminPage title="Partner sales cases" description="Price and approve client quotations for Innozanzi-only partner sales. Internal costs and contribution remain restricted to Admin pricing review." actions={<Link className={buttonClass} href="/admin/partnerships">Partnerships</Link>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Open cases" value={cases.length} detail="Active partner sales pipeline" />
        <MetricCard label="Awaiting pricing" value={awaiting} detail="Require Innozanzi review" />
        <MetricCard label="Approved quotes" value={cases.filter((item) => item.activeQuotation).length} detail="Current immutable versions" />
      </div>
      <Panel title="Pricing queue" description="Every approved client price is issued by Innozanzi and tied to a versioned commercial snapshot.">
        {cases.length === 0 ? <EmptyState title="No open partner cases" description="New partner enquiries will appear here for controlled pricing review." /> : <div className="-mx-4 overflow-x-auto"><table className={tableClass}><thead><tr><th>Case</th><th>Partner</th><th>Client</th><th>Items</th><th>Current quote</th><th>Status</th><th /></tr></thead><tbody>{cases.map((item) => <tr key={item.id}><td><Link className="font-semibold text-sky-700" href={`/admin/partnerships/sales-cases/${item.id}`}>{item.caseNumber}</Link><br /><span className="text-xs text-slate-500">{item.quotationRequest?.requestNumber ?? "No request"}</span></td><td>{item.profile.displayName}</td><td>{item.partnerClient.companyName}<br /><span className="text-xs text-slate-500">{item.partnerClient.contactName}</span></td><td>{item.quotationRequest?.items.length ?? 0}</td><td>{item.activeQuotation ? <><span className="font-semibold">R {Number(item.activeQuotation.grandTotal).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span><br /><span className="text-xs text-slate-500">v{item.activeQuotation.version} · expires {item.activeQuotation.validUntil.toLocaleString("en-ZA")}</span></> : "Not approved"}</td><td><StatusBadge value={item.status} /></td><td><Link className="font-semibold text-sky-700" href={`/admin/partnerships/sales-cases/${item.id}`}>Review</Link></td></tr>)}</tbody></table></div>}
      </Panel>
    </AdminPage>
  );
}
