"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission, requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";
import { canActivateAgreement, canChangeAgreement } from "@/domain/partnerships/agreement-rules";
import { commercialPdf } from "@/domain/documents/commercial-pdf";
import { getDocumentBranding } from "@/domain/documents/branding";

const agreementInput=z.object({partnershipId:z.string().uuid(),title:z.string().trim().min(5).max(200),body:z.string().trim().min(100).max(100_000),expiresAt:z.coerce.date().optional()});
const signatureInput=z.object({agreementId:z.string().uuid(),legalName:z.string().trim().min(2).max(160),initials:z.string().trim().min(1).max(12),signatureText:z.string().trim().min(2).max(160),consent:z.literal("on")});
const reference=()=>`AGR-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0,4).toUpperCase()}`;

export async function savePartnershipAgreementDraft(formData:FormData){
  const ctx=await requirePermission("partnership.partner.manage"),data=agreementInput.parse(Object.fromEntries(formData));
  const partner=await prisma.partnership.findUniqueOrThrow({where:{id:data.partnershipId},include:{agreement:{include:{versions:{orderBy:{version:"desc"},take:1}}},commercialTerms:true}});
  if(partner.agreement&&partner.agreement.status!=="DRAFT")throw new Error("Issued agreements cannot be edited. Create an amendment or renewal.");
  const version=(partner.agreement?.versions[0]?.version??0)+1;
  await prisma.$transaction(async tx=>{
    const agreement=partner.agreement??await tx.partnershipAgreement.create({data:{partnershipId:partner.id,agreementNumber:reference(),expiresAt:data.expiresAt}});
    await tx.partnershipAgreementVersion.create({data:{agreementId:agreement.id,version,title:data.title,body:data.body,createdById:ctx.user.id,termsSnapshot:partner.commercialTerms.map(term=>({type:term.type,title:term.title,value:term.value}))}});
    await tx.partnershipAgreement.update({where:{id:agreement.id},data:{currentVersion:version,expiresAt:data.expiresAt}});
    await tx.auditLog.create({data:{actorId:ctx.user.id,action:"partnership.agreement.draft",entityType:"PartnershipAgreement",entityId:agreement.id,after:{version,title:data.title}}});
  });
  revalidatePath(`/admin/partnerships/partners/${partner.id}`);
}

export async function issuePartnershipAgreement(formData:FormData){
  const ctx=await requirePermission("partnership.partner.manage"),agreementId=z.string().uuid().parse(formData.get("agreementId"));
  const agreement=await prisma.partnershipAgreement.findUniqueOrThrow({where:{id:agreementId},include:{partnership:{include:{owner:true}},versions:{where:{issuedAt:null},orderBy:{version:"desc"},take:1}}});
  const version=agreement.versions[0];if(agreement.status!=="DRAFT"||!version)throw new Error("Only the latest draft agreement can be issued.");
  await enqueueEmail(emailTemplates.partnershipApplication(agreement.partnership.owner.email,agreement.partnership.owner.name??"Partner",agreement.agreementNumber,"AWAITING PARTNER SIGNATURE","Please review, initial and sign the agreement in your Partner Workspace."),agreement.partnership.owner.id);
  await prisma.$transaction([
    prisma.partnershipAgreement.update({where:{id:agreement.id},data:{status:"AWAITING_PARTNER_SIGNATURE"}}),
    prisma.partnershipAgreementVersion.update({where:{id:version.id},data:{issuedAt:new Date()}}),
    prisma.auditLog.create({data:{actorId:ctx.user.id,action:"partnership.agreement.issue",entityType:"PartnershipAgreement",entityId:agreement.id,after:{version:version.version}}}),
  ]);
  revalidatePath(`/admin/partnerships/partners/${agreement.partnershipId}`);
}

async function signatureMetadata(){
  const values=await headers();return{ipAddress:(values.get("x-forwarded-for")??"").split(",")[0]?.trim()||null,userAgent:values.get("user-agent")};
}

export async function signPartnershipAgreementAsPartner(formData:FormData){
  const ctx=await requireUser(),data=signatureInput.parse(Object.fromEntries(formData));
  const agreement=await prisma.partnershipAgreement.findFirst({where:{id:data.agreementId,status:"AWAITING_PARTNER_SIGNATURE",partnership:{userId:ctx.user.id}},include:{versions:{orderBy:{version:"desc"},take:1},partnership:true}});
  if(!agreement?.versions[0])throw new Error("This agreement is not available for partner signature.");
  const metadata=await signatureMetadata();
  await prisma.$transaction([
    prisma.partnershipAgreementSignature.create({data:{agreementId:agreement.id,versionId:agreement.versions[0].id,signerId:ctx.user.id,signerRole:"PARTNER",legalName:data.legalName,initials:data.initials.toUpperCase(),signatureText:data.signatureText,consentText:"I confirm that I reviewed, initialled and agree to this version of the partnership agreement.",...metadata}}),
    prisma.partnershipAgreement.update({where:{id:agreement.id},data:{status:"AWAITING_INTERNAL_SIGNATURE"}}),
    prisma.auditLog.create({data:{actorId:ctx.user.id,action:"partnership.agreement.partner-sign",entityType:"PartnershipAgreement",entityId:agreement.id,after:{version:agreement.versions[0].version,legalName:data.legalName}}}),
  ]);
  revalidatePath("/account/partner");
}

export async function signPartnershipAgreementInternally(formData:FormData){
  const ctx=await requirePermission("partnership.application.approve"),data=signatureInput.parse(Object.fromEntries(formData));
  const agreement=await prisma.partnershipAgreement.findFirst({where:{id:data.agreementId,status:"AWAITING_INTERNAL_SIGNATURE"},include:{versions:{orderBy:{version:"desc"},take:1},partnership:{include:{owner:true}},signatures:true}});
  if(!agreement?.versions[0])throw new Error("Agreement version not found.");
  const prospective=[...agreement.signatures,{versionId:agreement.versions[0].id,signerRole:"INNOZANZI"}];
  if(!canActivateAgreement(prospective,agreement.versions[0].id))throw new Error("The partner must sign this exact agreement version first.");
  const metadata=await signatureMetadata(),now=new Date(),partnerSignature=agreement.signatures.find(item=>item.versionId===agreement.versions[0].id&&item.signerRole==="PARTNER")!;
  const branding=await getDocumentBranding();
  const pdf=commercialPdf({title:"SIGNED PARTNERSHIP AGREEMENT",number:agreement.agreementNumber,customer:agreement.partnership.owner.name??agreement.partnership.owner.email,email:agreement.partnership.owner.email,issueDate:now,dueDate:agreement.expiresAt??undefined,lines:[],notes:`${agreement.versions[0].body}\n\nSIGNATURES\nPartner: ${partnerSignature.legalName} (${partnerSignature.initials}) — signed ${partnerSignature.signedAt.toLocaleString("en-ZA")}\nInnozanzi: ${data.legalName} (${data.initials.toUpperCase()}) — signed ${now.toLocaleString("en-ZA")}\n\nBoth signatures apply to version ${agreement.versions[0].version}.`},branding);
  await prisma.$transaction([
    prisma.partnershipAgreementSignature.create({data:{agreementId:agreement.id,versionId:agreement.versions[0].id,signerId:ctx.user.id,signerRole:"INNOZANZI",legalName:data.legalName,initials:data.initials.toUpperCase(),signatureText:data.signatureText,consentText:"I am authorised to sign this agreement for Innozanzi and approve this exact version.",...metadata}}),
    prisma.partnershipAgreement.update({where:{id:agreement.id},data:{status:"ACTIVE",activatedAt:now,effectiveAt:now}}),
    prisma.partnershipAgreementVersion.update({where:{id:agreement.versions[0].id},data:{pdfContent:Uint8Array.from(pdf),pdfFilename:`${agreement.agreementNumber}-signed-v${agreement.versions[0].version}.pdf`}}),
    prisma.partnership.update({where:{id:agreement.partnershipId},data:{status:"APPROVED"}}),
    prisma.auditLog.create({data:{actorId:ctx.user.id,action:"partnership.agreement.internal-sign",entityType:"PartnershipAgreement",entityId:agreement.id,after:{version:agreement.versions[0].version,activatedAt:now.toISOString()}}}),
  ]);
  await enqueueEmail(emailTemplates.partnershipApplication(agreement.partnership.owner.email,agreement.partnership.owner.name??"Partner",agreement.agreementNumber,"ACTIVE","Both parties have signed the agreement. The completed agreement is available in your Partner Workspace."),agreement.partnership.owner.id);
  revalidatePath(`/admin/partnerships/partners/${agreement.partnershipId}`);
}

export async function createPartnershipChange(formData:FormData){
  const ctx=await requirePermission("partnership.partner.manage");
  const data=z.object({agreementId:z.string().uuid(),type:z.enum(["AMENDMENT","RENEWAL"]),reason:z.string().trim().min(10).max(3000),proposedBody:z.string().trim().min(100).max(100_000),newExpiryAt:z.coerce.date().optional()}).parse(Object.fromEntries(formData));
  const agreement=await prisma.partnershipAgreement.findUniqueOrThrow({where:{id:data.agreementId}});
  if(!canChangeAgreement(agreement.status))throw new Error("Only an active agreement can be amended or renewed.");
  await prisma.partnershipChange.create({data:{partnershipId:agreement.partnershipId,agreementId:agreement.id,type:data.type,status:"PROPOSED",reason:data.reason,proposedBody:data.proposedBody,newExpiryAt:data.newExpiryAt,requestedById:ctx.user.id}});
  await prisma.auditLog.create({data:{actorId:ctx.user.id,action:`partnership.${data.type.toLowerCase()}.propose`,entityType:"PartnershipAgreement",entityId:agreement.id,after:{reason:data.reason,newExpiryAt:data.newExpiryAt?.toISOString()}}});
  revalidatePath(`/admin/partnerships/partners/${agreement.partnershipId}`);
}

export async function approvePartnershipChange(formData:FormData){
  const ctx=await requirePermission("partnership.application.approve"),id=z.string().uuid().parse(formData.get("id"));
  const change=await prisma.partnershipChange.findUniqueOrThrow({where:{id},include:{agreement:{include:{partnership:{include:{commercialTerms:true}}}}}});
  if(change.status!=="PROPOSED"||!change.proposedBody)throw new Error("This change is not awaiting approval.");
  await prisma.$transaction(async tx=>{
    const version=change.agreement.currentVersion+1;
    const created=await tx.partnershipAgreementVersion.create({data:{agreementId:change.agreementId,version,title:`${change.type==="RENEWAL"?"Renewed":"Amended"} partnership agreement`,body:change.proposedBody!,createdById:ctx.user.id,issuedAt:new Date(),termsSnapshot:change.agreement.partnership.commercialTerms.map(term=>({type:term.type,title:term.title,value:term.value}))}});
    await tx.partnershipAgreementSignature.deleteMany({where:{agreementId:change.agreementId}});
    await tx.partnershipAgreement.update({where:{id:change.agreementId},data:{currentVersion:version,status:"AWAITING_PARTNER_SIGNATURE",expiresAt:change.newExpiryAt}});
    await tx.partnershipChange.update({where:{id},data:{status:"AWAITING_SIGNATURES",approvedById:ctx.user.id,approvedAt:new Date(),resultingVersionId:created.id}});
    await tx.auditLog.create({data:{actorId:ctx.user.id,action:`partnership.${change.type.toLowerCase()}.approve`,entityType:"PartnershipChange",entityId:id,after:{version}}});
  });
  revalidatePath(`/admin/partnerships/partners/${change.partnershipId}`);
}

export async function uploadOfflineSignedAgreement(formData:FormData){
  const ctx=await requirePermission("partnership.document.review");
  const changeId=z.string().uuid().parse(formData.get("changeId")),file=formData.get("file");
  if(!(file instanceof File)||!file.size||file.size>20*1024*1024||file.type!=="application/pdf")throw new Error("Upload a signed PDF smaller than 20 MB.");
  const change=await prisma.partnershipChange.findUniqueOrThrow({where:{id:changeId},include:{agreement:true}});
  if(!["PROPOSED","AWAITING_SIGNATURES"].includes(change.status))throw new Error("This change cannot accept a signed agreement.");
  const bucket=process.env.SUPABASE_PRIVATE_BUCKET??"private-documents",path=`partnerships/${change.partnershipId}/signed/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`,storage=createSupabaseAdmin();
  const uploaded=await storage.storage.from(bucket).upload(path,file,{contentType:file.type});if(uploaded.error)throw uploaded.error;
  try{await prisma.$transaction(async tx=>{const document=await tx.uploadedDocument.create({data:{bucket,path,originalName:file.name,mimeType:file.type,size:file.size,isPrivate:true}});await tx.partnershipChange.update({where:{id:change.id},data:{status:"COMPLETED_OFFLINE",approvedById:ctx.user.id,approvedAt:new Date(),effectiveAt:new Date(),offlineSignedDocumentId:document.id}});await tx.partnershipAgreement.update({where:{id:change.agreementId},data:{status:"ACTIVE",effectiveAt:new Date(),expiresAt:change.newExpiryAt??change.agreement.expiresAt}});await tx.auditLog.create({data:{actorId:ctx.user.id,action:"partnership.agreement.offline-upload",entityType:"PartnershipChange",entityId:change.id,after:{documentId:document.id,originalName:file.name}}})})}catch(error){await storage.storage.from(bucket).remove([path]);throw error}
  revalidatePath(`/admin/partnerships/partners/${change.partnershipId}`);
}
