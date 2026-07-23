import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage, Panel, StatusBadge, buttonClass, inputClass, secondaryButtonClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import {
  approvePartnershipChange, createPartnershipChange, issuePartnershipAgreement,
  savePartnershipAgreementDraft, signPartnershipAgreementInternally, uploadOfflineSignedAgreement,
} from "@/domain/partnerships/agreement-actions";
import { prisma } from "@/lib/prisma";

const defaultBody=(name:string,type:string)=>`PARTNERSHIP AGREEMENT

This agreement is between Innozanzi (Pty) Ltd and ${name} for the ${type} programme.

1. PURPOSE
The parties will cooperate on approved technology procurement and related services.

2. COMMERCIAL TERMS
Only commercial terms recorded and approved in the Innozanzi platform apply. Neither party may rely on an unsigned draft.

3. RESPONSIBILITIES
Each party will provide accurate information, protect confidential information and perform its agreed responsibilities lawfully.

4. DURATION AND TERMINATION
The agreement remains effective for the recorded term unless renewed, amended or terminated through the controlled partnership process.

5. ACCEPTANCE
The agreement becomes active only after the partner and an authorised Innozanzi representative sign the same version.`;

export default async function AgreementPage({params}:{params:Promise<{id:string}>}){
  await requirePermission("partnership.view");
  const id=(await params).id;
  const row=await prisma.partnership.findUnique({
    where:{id},
    include:{
      owner:true,partnershipType:true,
      agreement:{include:{
        versions:{orderBy:{version:"desc"}},
        signatures:{include:{signer:{select:{name:true,email:true}}},orderBy:{signedAt:"asc"}},
        changes:{include:{offlineSignedDocument:true},orderBy:{createdAt:"desc"}},
      }},
    },
  });
  if(!row)notFound();
  const agreement=row.agreement,current=agreement?.versions[0];
  return <AdminPage title={`Agreement · ${row.partnerNumber}`} description={`${row.owner.name??row.owner.email} · ${row.partnershipType.name}`} actions={<><Link className={secondaryButtonClass} href={`/admin/partnerships/partners/${row.id}`}>Back</Link>{agreement?<StatusBadge value={agreement.status}/>:null}</>}>
    <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]"><div className="space-y-4">
      {!agreement||agreement.status==="DRAFT"?<Panel title={agreement?"Create a new draft version":"Create agreement draft"} description="Saving creates an immutable version. Issued text cannot be edited; later changes use amendments or renewals.">
        <form action={savePartnershipAgreementDraft} className="grid gap-3"><input type="hidden" name="partnershipId" value={row.id}/><label>Agreement title<input className={`${inputClass} mt-1 w-full`} name="title" defaultValue="Innozanzi Partnership Agreement" required/></label><label>Expiry date<input className={`${inputClass} mt-1 w-full`} name="expiresAt" type="date"/></label><label>Agreement wording<textarea className={`${inputClass} mt-1 min-h-[30rem] w-full font-mono text-sm`} name="body" defaultValue={current?.body??defaultBody(row.owner.name??row.owner.email,row.partnershipType.name)} required/></label><button className={buttonClass}>Save immutable draft version</button></form>
        {current?<form action={issuePartnershipAgreement} className="mt-4"><input type="hidden" name="agreementId" value={agreement!.id}/><button className={buttonClass}>Issue version {current.version} for partner signature</button></form>:null}
      </Panel>:null}
      {agreement?<Panel title="Agreement versions">{agreement.versions.map(version=><details className="border p-3" key={version.id}><summary className="cursor-pointer font-bold">Version {version.version} · {version.issuedAt?"Issued":"Draft"} · {version.createdAt.toLocaleString("en-ZA")}</summary>{version.pdfContent?<a className="mt-3 inline-block font-bold text-sky-700 underline" href={`/api/partnership-agreements/${encodeURIComponent(agreement.agreementNumber)}/pdf`}>Download signed PDF</a>:null}<pre className="mt-3 whitespace-pre-wrap text-sm">{version.body}</pre></details>)}</Panel>:null}
      {agreement?.status==="AWAITING_INTERNAL_SIGNATURE"?<Panel title="Authorised internal signature"><form action={signPartnershipAgreementInternally} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="agreementId" value={agreement.id}/><input className={inputClass} name="legalName" placeholder="Authorised legal name" required/><input className={inputClass} name="initials" placeholder="Initials" required/><input className={inputClass} name="signatureText" placeholder="Type full name as signature" required/><label className="flex gap-2 border p-3 text-sm"><input name="consent" type="checkbox" required/>I am authorised to sign for Innozanzi.</label><button className={`${buttonClass} sm:col-span-2`}>Sign and activate agreement</button></form></Panel>:null}
      {agreement?.status==="ACTIVE"?<Panel title="Renew or amend"><form action={createPartnershipChange} className="grid gap-3"><input type="hidden" name="agreementId" value={agreement.id}/><select className={inputClass} name="type"><option value="AMENDMENT">Amendment</option><option value="RENEWAL">Renewal</option></select><input className={inputClass} name="newExpiryAt" type="date"/><textarea className={`${inputClass} min-h-24`} name="reason" placeholder="Business reason and scope of change" required/><textarea className={`${inputClass} min-h-[24rem] font-mono text-sm`} name="proposedBody" defaultValue={current?.body} required/><button className={buttonClass}>Submit controlled change</button></form></Panel>:null}
    </div><aside className="space-y-4">
      {agreement?<Panel title="Signatures">{agreement.signatures.length?agreement.signatures.map(signature=><div className="mb-3 border-l-2 border-emerald-500 pl-3 text-sm" key={signature.id}><strong>{signature.signerRole}</strong><p>{signature.legalName} ({signature.initials})</p><p className="text-xs text-slate-500">{signature.signedAt.toLocaleString("en-ZA")}</p></div>):<p className="text-sm text-slate-500">No signatures recorded.</p>}</Panel>:null}
      {agreement?.changes.map(change=><Panel title={`${change.type} · ${change.status}`} key={change.id}><p className="text-sm">{change.reason}</p>{change.status==="PROPOSED"?<form action={approvePartnershipChange} className="mt-3"><input type="hidden" name="id" value={change.id}/><button className={buttonClass}>Approve and issue new version</button></form>:null}{["PROPOSED","AWAITING_SIGNATURES"].includes(change.status)?<form action={uploadOfflineSignedAgreement} className="mt-4 grid gap-2"><input type="hidden" name="changeId" value={change.id}/><label className="text-sm font-semibold">Or upload fully signed offline PDF<input className={`${inputClass} mt-1 w-full`} name="file" type="file" accept="application/pdf" required/></label><button className={secondaryButtonClass}>Upload and activate</button></form>:null}{change.offlineSignedDocument?<a className="mt-3 block text-sm text-sky-700 underline" href={`/api/documents/${change.offlineSignedDocumentId}`}>Download signed PDF</a>:null}</Panel>)}
    </aside></div>
  </AdminPage>;
}
