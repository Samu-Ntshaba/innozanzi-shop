import Link from "next/link";
import { requirePartnerSalesContext } from "@/domain/partner-sales/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PartnerSalesPage() {
  const { partnership } = await requirePartnerSalesContext();
  const cases = await prisma.partnerQuoteCase.findMany({
    where: { partnershipId: partnership.id },
    select: {
      caseNumber: true,
      status: true,
      updatedAt: true,
      partnerClient: { select: { companyName: true, contactName: true } },
      activeQuotation: { select: { grandTotal: true, validUntil: true, version: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <p className="text-xs font-black uppercase tracking-[.18em] text-sky-700">Partner sales</p>
    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Quotation cases</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review approved Innozanzi quotations, request a revision, or send the exact approved version to your client.</p>
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Case</th><th className="px-5 py-3">Client</th><th className="px-5 py-3">Quotation</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Updated</th></tr></thead><tbody className="divide-y divide-slate-100">{cases.map((item) => <tr key={item.caseNumber}><td className="px-5 py-4"><Link className="font-bold text-sky-700 underline" href={`/account/partner/sales/${encodeURIComponent(item.caseNumber)}`}>{item.caseNumber}</Link></td><td className="px-5 py-4">{item.partnerClient.companyName}<br /><span className="text-xs text-slate-500">{item.partnerClient.contactName}</span></td><td className="px-5 py-4">{item.activeQuotation ? <>R {Number(item.activeQuotation.grandTotal).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}<br /><span className="text-xs text-slate-500">v{item.activeQuotation.version} · expires {item.activeQuotation.validUntil.toLocaleDateString("en-ZA")}</span></> : "Awaiting review"}</td><td className="px-5 py-4 font-bold text-slate-700">{item.status.replaceAll("_", " ")}</td><td className="px-5 py-4 text-slate-600">{item.updatedAt.toLocaleDateString("en-ZA")}</td></tr>)}</tbody></table></div>
      {!cases.length ? <p className="px-5 py-12 text-center text-sm text-slate-500">No quotation cases yet.</p> : null}
    </section>
  </main>;
}
