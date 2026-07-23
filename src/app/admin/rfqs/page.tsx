import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import type { RfqStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/domain/auth/session";
import { createRfq } from "@/domain/rfq/actions";
import {
  AdminPage,
  EmptyState,
  MetricCard,
  Pagination,
  Panel,
  StatusBadge,
  buttonClass,
  inputClass,
  secondaryButtonClass,
  tableClass,
} from "@/components/admin/admin-ui";

const PAGE_SIZE = 25;
const statuses: RfqStatus[] = [
  "DRAFT",
  "READY_FOR_REVIEW",
  "UNDER_REVIEW",
  "PRICING_IN_PROGRESS",
  "AWAITING_APPROVAL",
  "APPROVED",
  "SUBMITTED",
  "WON",
  "LOST",
  "CANCELLED",
  "EXPIRED",
  "COMPLETED",
];

export default async function RfqsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const context = await requirePermission("rfq.view");
  const parameters = await searchParams;
  const query = parameters.q?.trim().slice(0, 120) ?? "";
  const status = statuses.includes(parameters.status as RfqStatus) ? (parameters.status as RfqStatus) : undefined;
  const requestedPage = Math.max(1, Number.parseInt(parameters.page ?? "1", 10) || 1);
  const scope: Prisma.RfqOpportunityWhereInput =
    !context.isSuperAdministrator && context.user.companyId ? { companyId: context.user.companyId } : {};
  const where: Prisma.RfqOpportunityWhereInput = {
    ...scope,
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            { referenceNumber: { contains: query, mode: "insensitive" } },
            { externalReference: { contains: query, mode: "insensitive" } },
            { title: { contains: query, mode: "insensitive" } },
            { issuingOrganisation: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, pipelineStats] = await Promise.all([
    prisma.rfqOpportunity.count({ where }),
    prisma.rfqOpportunity.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const rfqs = await prisma.rfqOpportunity.findMany({
    where,
    include: { assignedUser: { select: { name: true, email: true } } },
    orderBy: [{ closingAt: "asc" }, { updatedAt: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const count = (matching: RfqStatus[]) =>
    pipelineStats.filter((item) => matching.includes(item.status)).reduce((sum, item) => sum + item._count._all, 0);
  const activeFilters = Boolean(query || status);

  return (
    <AdminPage
      title="RFQs & tenders"
      description="Capture opportunities, review source evidence, prepare pricing and manage approvals."
      actions={<a className={buttonClass} href="#new-rfq">Create RFQ</a>}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open pipeline" value={count(statuses.filter((item) => !["LOST", "CANCELLED", "EXPIRED", "COMPLETED"].includes(item)))} detail="Active opportunities" />
        <MetricCard label="Awaiting approval" value={count(["AWAITING_APPROVAL"])} detail="Decision required" />
        <MetricCard label="Submitted" value={count(["SUBMITTED"])} detail="Awaiting client outcome" />
        <MetricCard label="Won or completed" value={count(["WON", "COMPLETED"])} detail="Successful opportunities" />
      </div>

      <Panel title="Opportunity register" description="Search by reference, title or issuing organisation.">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="min-w-[16rem] flex-1 text-xs font-semibold text-slate-700">
            Search RFQs
            <input className={`${inputClass} mt-1 w-full`} defaultValue={query} name="q" placeholder="Reference, title or organisation" />
          </label>
          <label className="min-w-52 text-xs font-semibold text-slate-700">
            Status
            <select className={`${inputClass} mt-1 w-full`} defaultValue={status ?? ""} name="status">
              <option value="">All statuses</option>
              {statuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <button className={buttonClass}>Apply filters</button>
          {activeFilters ? <Link className={secondaryButtonClass} href="/admin/rfqs">Clear</Link> : null}
        </form>

        <div className="-mx-4 mt-4 overflow-x-auto border-y border-slate-200">
          {rfqs.length ? (
            <table className={tableClass}>
              <thead><tr><th>Reference</th><th>Opportunity</th><th>Closing</th><th>Owner</th><th>Status</th><th className="text-right">Value</th><th><span className="sr-only">Action</span></th></tr></thead>
              <tbody>
                {rfqs.map((rfq) => (
                  <tr key={rfq.id}>
                    <td><strong>{rfq.referenceNumber}</strong>{rfq.externalReference ? <><br /><span className="text-xs text-slate-500">{rfq.externalReference}</span></> : null}</td>
                    <td><span className="font-medium text-slate-900">{rfq.title}</span><br /><span className="text-xs text-slate-500">{rfq.issuingOrganisation} · {rfq.type}</span></td>
                    <td>{rfq.closingAt?.toLocaleDateString("en-ZA") ?? "Not set"}</td>
                    <td>{rfq.assignedUser?.name ?? rfq.assignedUser?.email ?? "Unassigned"}</td>
                    <td><StatusBadge value={rfq.status} /></td>
                    <td className="text-right tabular-nums">R {Number(rfq.sellingIncludingVat).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
                    <td><Link className="whitespace-nowrap font-semibold text-sky-700 hover:underline" href={`/admin/rfqs/${rfq.id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState title="No RFQs found" description={activeFilters ? "No opportunities match the current search and filters. Clear them to see the full register." : "Create the first RFQ or tender opportunity to start the workflow."} />}
        </div>
        <div className="pt-4"><Pagination page={page} pageCount={pageCount} total={total} query={{ q: query, status }} /></div>
      </Panel>

      <details id="new-rfq" className="scroll-mt-20 border border-slate-300 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between">Create a new RFQ or tender <span aria-hidden="true" className="text-sky-700">＋</span></span>
        </summary>
        <form action={createRfq} className="grid gap-4 border-t border-slate-200 p-4 md:grid-cols-2">
          <p className="text-sm text-slate-600 md:col-span-2">Capture the core opportunity first. Source documents, analysis and pricing are managed in its workspace.</p>
          <label className="text-sm font-semibold text-slate-800 md:col-span-2">Opportunity title <span className="text-rose-600">*</span><input className={`${inputClass} mt-1 w-full`} name="title" placeholder="Office furniture supply and installation" required /></label>
          <label className="text-sm font-semibold text-slate-800">Issuing organisation <span className="text-rose-600">*</span><input className={`${inputClass} mt-1 w-full`} name="issuingOrganisation" placeholder="Organisation name" required /></label>
          <label className="text-sm font-semibold text-slate-800">Opportunity type<select className={`${inputClass} mt-1 w-full`} name="type">{["RFQ", "TENDER", "RFP", "RFI", "OTHER"].map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-800">External reference <span className="font-normal text-slate-500">(optional)</span><input className={`${inputClass} mt-1 w-full`} name="externalReference" placeholder="Client or portal reference" /></label>
          <label className="text-sm font-semibold text-slate-800">Closing date <span className="font-normal text-slate-500">(optional)</span><input className={`${inputClass} mt-1 w-full`} name="closingAt" type="datetime-local" /></label>
          <label className="text-sm font-semibold text-slate-800 md:col-span-2">Brief description <span className="font-normal text-slate-500">(optional)</span><textarea className={`${inputClass} mt-1 min-h-24 w-full resize-y`} name="description" placeholder="What is the client asking you to supply or deliver?" /></label>
          <div className="flex justify-end border-t border-slate-200 pt-4 md:col-span-2"><button className={buttonClass}>Create opportunity</button></div>
        </form>
      </details>
    </AdminPage>
  );
}
