"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { assertBusinessDocumentAccess,getOrCreateBusinessDocument, businessDocumentTypes } from "@/domain/documents/business-documents";
import { enqueueEmail } from "@/integrations/email/outbox";
import { businessDocumentEmail } from "@/integrations/email/templates";
import { isProductionDeployment } from "@/integrations/email/provider";
import { prisma } from "@/lib/prisma";

const emails=z.string().trim().max(1000).transform(value=>value?value.split(/[;,]/).map(email=>email.trim().toLowerCase()).filter(Boolean):[]).pipe(z.array(z.string().email()).max(10));

export async function sendBusinessDocument(formData:FormData){
  const context=await requirePermission("documents.send");
  const data=z.object({type:z.enum(businessDocumentTypes),recordId:z.string().uuid(),to:z.string().trim().email(),cc:emails,subject:z.string().trim().min(3).max(200),message:z.string().trim().min(10).max(10000),confirmExternal:z.string().optional()}).parse(Object.fromEntries(formData));
  await assertBusinessDocumentAccess(context,data.type,data.recordId);
  const {artifact,descriptor}=await getOrCreateBusinessDocument(data.type,data.recordId,context.user.id);
  let recipient=data.to.toLowerCase();let cc=data.cc;
  if(descriptor.isTestData){
    if(isProductionDeployment())throw new Error("Test documents cannot be sent from production.");
    const controlled=process.env.TEST_EMAIL_RECIPIENT?.trim().toLowerCase();
    if(!controlled)throw new Error("Set TEST_EMAIL_RECIPIENT before sending test documents.");
    recipient=controlled;cc=[];
  }else if(descriptor.recipientEmail&&recipient!==descriptor.recipientEmail.toLowerCase()&&data.confirmExternal!=="on"){
    throw new Error("Confirm the warning before sending this document to a different external address.");
  }
  const previous=await prisma.documentDispatch.count({where:{businessDocumentId:artifact.id,status:"SENT"}});
  const dispatch=await prisma.documentDispatch.create({data:{businessDocumentId:artifact.id,sentById:context.user.id,toRecipients:[recipient],ccRecipients:cc,subject:data.subject,message:data.message,attachmentNames:[artifact.filename],isResend:previous>0,isTestData:descriptor.isTestData}});
  try{
    const notification=await enqueueEmail(businessDocumentEmail({to:recipient,cc,subject:data.subject,message:data.message,documentLabel:descriptor.label,documentNumber:descriptor.number,idempotencyKey:`document:${artifact.id}:${dispatch.id}:${randomUUID()}`,attachment:{filename:artifact.filename,content:Buffer.from(artifact.content),contentType:artifact.mimeType}}),context.user.id);
    await prisma.$transaction([
      prisma.documentDispatch.update({where:{id:dispatch.id},data:{status:"SENT",sentAt:new Date(),providerMessageId:notification.id,providerResponse:"Accepted by configured email provider"}}),
      prisma.auditLog.create({data:{actorId:context.user.id,action:previous?"document.resend":"document.send",entityType:"BusinessDocument",entityId:artifact.id,after:{type:data.type,recordId:data.recordId,to:recipient,cc,dispatchId:dispatch.id}}}),
    ]);
  }catch(error){
    await prisma.documentDispatch.update({where:{id:dispatch.id},data:{status:"FAILED",failureReason:error instanceof Error?error.message.slice(0,2000):"Email delivery failed."}});
    throw error;
  }
  redirect(`/admin/documents/send?type=${data.type}&id=${data.recordId}&sent=1`);
}
