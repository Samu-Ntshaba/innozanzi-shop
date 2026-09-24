import Link from "next/link";
import { requirePartnerSalesContext } from "@/domain/partner-sales/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewPartnerShowcasePage() {
  const { partnership } = await requirePartnerSalesContext();
  const profile = await prisma.partnerSalesProfile.findUnique({
    where: { partnershipId: partnership.id },
    select: { id: true, displayName: true, publicSlug: true, status: true },
  });
  const assignments = profile
    ? await prisma.partnerCatalogueAssignment.findMany({
        where: { profileId: profile.id, status: "ACTIVE" },
        select: { id: true, presentationTitle: true, presentationCopy: true },
        orderBy: { createdAt: "asc" },
        take: 100,
      })
    : [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link className="text-sm font-semibold text-sky-700 underline" href="/account/partner/showcases">Back to showcases</Link>
      <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">New showcase</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Choose from catalogue items approved by Innozanzi. Pricing is handled through the quotation workflow.</p>
      <form className="mt-7 grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" method="post" action="/api/partner-sales/showcases">
        <input type="hidden" name="partnershipId" value={partnership.id} />
        <input type="hidden" name="profileId" value={profile?.id ?? ""} />
        <label className="grid gap-1 text-sm font-bold text-slate-800">Showcase title<input className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" name="title" maxLength={180} required /></label>
        <label className="grid gap-1 text-sm font-bold text-slate-800">Introduction<textarea className="min-h-28 rounded-lg border border-slate-300 px-3 py-2 font-normal" name="introduction" maxLength={1200} /></label>
        <fieldset className="grid gap-3"><legend className="text-sm font-bold text-slate-800">Approved catalogue items</legend>{assignments.map((assignment) => <label className="flex gap-3 rounded-lg border border-slate-200 p-3 text-sm" key={assignment.id}><input type="checkbox" name="assignmentIds" value={assignment.id} /><span><span className="font-bold">{assignment.presentationTitle ?? "Approved catalogue item"}</span>{assignment.presentationCopy ? <span className="mt-1 block text-slate-600">{assignment.presentationCopy}</span> : null}</span></label>)}{!assignments.length ? <p className="text-sm text-slate-500">No approved items are currently eligible.</p> : null}</fieldset>
        <div className="flex flex-wrap gap-3"><button className="min-h-11 rounded-xl bg-sky-700 px-5 text-sm font-black text-white hover:bg-sky-800" disabled={!profile || !assignments.length}>Save draft</button><Link className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700" href="/account/partner/showcases">Cancel</Link></div>
      </form>
    </main>
  );
}
