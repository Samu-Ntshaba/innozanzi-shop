import Link from "next/link";
import { FileUp, ListChecks } from "lucide-react";
import { requireUser } from "@/domain/auth/session";
import { partnershipEligibility } from "@/domain/partnerships/service";
import { prisma } from "@/lib/prisma";

const editableStatuses = ["DRAFT", "CHANGES_REQUESTED", "DOCUMENTS_REQUIRED"];
const friendly = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, character => character.toUpperCase());

export default async function PartnershipAccount({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const ctx = await requireUser();
  const params = await searchParams;
  const eligibility = await partnershipEligibility(ctx.user.id);
  const latest = await prisma.partnershipApplication.findFirst({ where: { userId: ctx.user.id }, include: { partnershipType: true, documents: true, statusHistory: { orderBy: { createdAt: "desc" }, take: 12 } }, orderBy: { createdAt: "desc" } });

  if (eligibility.approvedPartnership) return <main className="mx-auto max-w-5xl px-4 py-10"><h1 className="text-3xl font-black">Partnership</h1><div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-6"><h2 className="text-xl font-bold text-emerald-900">Your partnership is active</h2><p className="mt-2 text-emerald-800">Partner reference {eligibility.approvedPartnership.partnerNumber}</p><Link className="mt-5 inline-block rounded-lg bg-[#071b33] px-5 py-3 font-bold text-white" href="/account/partner">Open Partner Workspace</Link></div></main>;

  const editable = latest ? editableStatuses.includes(latest.status) : false;
  const uploaded = new Set(latest?.documents.map(document => document.documentType) ?? []);
  const required = latest?.partnershipType.requiredDocumentTypes ?? [];
  const missing = required.filter(type => !uploaded.has(type));

  return <main className="mx-auto max-w-5xl px-4 py-10">
    <h1 className="text-3xl font-black">Partnership application</h1>
    <p className="mt-2 max-w-2xl text-slate-600">Apply for verified business sourcing, recurring procurement or reseller support in three clear stages: company details, purchasing profile, then private supporting documents and review.</p>
    {params.submitted ? <p className="mt-5 rounded-lg bg-emerald-50 p-4 text-emerald-800">Application submitted successfully. Our team will review it and your supporting evidence.</p> : null}

    {latest ? <section className="mt-7 rounded-xl border bg-white p-5 sm:p-6">
      <div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs font-bold uppercase text-sky-700">{latest.partnershipType.name}</p><h2 className="mt-1 text-xl font-bold">{latest.applicationNumber}</h2></div><span className="h-fit rounded bg-slate-100 px-3 py-2 text-xs font-bold">{latest.status.replaceAll("_", " ")}</span></div>
      {latest.customerResponseNote ? <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{latest.customerResponseNote}</p> : null}
      {editable ? <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4"><div className="flex gap-3"><ListChecks className="size-5 shrink-0 text-sky-700"/><div><h3 className="font-bold">Application details</h3><p className="mt-1 text-sm leading-5 text-slate-600">Continue from stage {Math.min(3, Math.max(1, latest.currentStep))} and complete any missing business information.</p></div></div><Link className="mt-4 inline-block rounded-lg bg-[#071b33] px-4 py-2 text-sm font-bold text-white" href={`/account/partnership/apply?application=${latest.id}`}>Continue application</Link></div>
        <div className={`rounded-xl border p-4 ${missing.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}><div className="flex gap-3"><FileUp className={`size-5 shrink-0 ${missing.length ? "text-amber-700" : "text-emerald-700"}`}/><div><h3 className="font-bold">Supporting documents</h3><p className="mt-1 text-sm leading-5 text-slate-700">{required.length ? `${uploaded.size} of ${required.length} required document type${required.length === 1 ? "" : "s"} uploaded.` : "No mandatory document types are configured for this track."}</p>{missing.length ? <p className="mt-2 text-xs font-semibold text-amber-900">Still needed: {missing.map(friendly).join(", ")}</p> : null}</div></div><Link className="mt-4 inline-block rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white" href={`/account/partnership/apply?application=${latest.id}&stage=3`}>Upload documents</Link></div>
      </div> : null}
      <h3 className="mt-6 font-bold">Status history</h3><div className="mt-3 space-y-3">{latest.statusHistory.map(history => <div className="border-l-2 border-sky-500 pl-3" key={history.id}><p className="text-sm font-semibold">{history.toStatus.replaceAll("_", " ")}</p><p className="text-xs text-slate-500">{history.createdAt.toLocaleString("en-ZA")}</p>{history.reason ? <p className="text-sm">{history.reason}</p> : null}</div>)}</div>
    </section> : <section className="mt-7 rounded-xl border bg-white p-6">
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950"><strong>What you will need</strong><p className="mt-1 leading-6">Company registration details, a short purchasing profile and the supporting documents requested for your chosen partnership track. Document upload appears in the final stage before submission.</p></div>
      {eligibility.reasons.length ? <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900"><strong>Complete these onboarding requirements before submission:</strong><ul className="mt-2 list-disc pl-5">{eligibility.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><p className="mt-2">You may start and save the application while completing them.</p></div> : null}
      <Link className="mt-5 inline-block rounded-lg bg-sky-600 px-5 py-3 font-bold text-white" href="/account/partnership/apply">Start partnership application</Link>
    </section>}
  </main>;
}
