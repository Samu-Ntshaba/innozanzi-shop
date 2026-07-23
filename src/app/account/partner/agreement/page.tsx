import { notFound } from "next/navigation";
import { requireUser } from "@/domain/auth/session";
import { signPartnershipAgreementAsPartner } from "@/domain/partnerships/agreement-actions";
import { prisma } from "@/lib/prisma";

export default async function PartnerAgreement(){
  const ctx=await requireUser();
  const agreement=await prisma.partnershipAgreement.findFirst({where:{partnership:{userId:ctx.user.id}},include:{partnership:true,versions:{orderBy:{version:"desc"},take:1},signatures:{orderBy:{signedAt:"asc"}}}});
  if(!agreement?.versions[0])notFound();
  const version=agreement.versions[0],partnerSigned=agreement.signatures.some(x=>x.versionId===version.id&&x.signerRole==="PARTNER");
  return <main className="mx-auto max-w-4xl px-4 py-10">
    <p className="text-xs font-bold uppercase text-sky-700">Partnership agreement</p>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-black">{agreement.agreementNumber}</h1><span className="rounded bg-slate-100 px-3 py-2 text-xs font-bold">{agreement.status.replaceAll("_"," ")}</span></div>
    {agreement.status==="ACTIVE"&&version.pdfContent?<a className="mt-5 inline-block rounded bg-[#071b33] px-5 py-3 font-bold text-white" href={`/api/partnership-agreements/${encodeURIComponent(agreement.agreementNumber)}/pdf`}>Download signed agreement PDF</a>:null}
    <section className="mt-6 rounded-xl border bg-white p-5 sm:p-8"><p className="text-sm font-semibold">Version {version.version}</p><pre className="mt-5 whitespace-pre-wrap font-sans text-sm leading-7">{version.body}</pre></section>
    {agreement.status==="AWAITING_PARTNER_SIGNATURE"&&!partnerSigned?<section className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-5"><h2 className="text-lg font-bold">Initial and sign this exact version</h2><form action={signPartnershipAgreementAsPartner} className="mt-4 grid gap-3 sm:grid-cols-2"><input type="hidden" name="agreementId" value={agreement.id}/><input className="rounded border bg-white px-3 py-3" name="legalName" placeholder="Your full legal name" defaultValue={ctx.user.name??""} required/><input className="rounded border bg-white px-3 py-3" name="initials" placeholder="Initials" required/><input className="rounded border bg-white px-3 py-3" name="signatureText" placeholder="Type your full name as signature" required/><label className="flex gap-2 rounded border bg-white p-3 text-sm"><input name="consent" type="checkbox" required/>I reviewed, initialled and agree to version {version.version}.</label><button className="rounded bg-[#071b33] px-5 py-3 font-bold text-white sm:col-span-2">Sign agreement</button></form></section>:partnerSigned?<p className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">You signed version {version.version}. {agreement.status==="ACTIVE"?"The agreement is active.":"It is awaiting Innozanzi’s authorised signature."}</p>:null}
  </main>;
}
