"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";

export async function decideFinalQuotation(formData:FormData){
  const{user}=await requireUser();const{id,decision}=z.object({id:z.string().uuid(),decision:z.enum(["ACCEPTED","REJECTED"])}).parse(Object.fromEntries(formData));const requestHeaders=await headers();
  const quote=await prisma.$transaction(async tx=>{const row=await tx.quotation.findFirstOrThrow({where:{id,customerId:user.id},include:{quotationRequest:true}});if(row.kind!=="FINAL"||row.status!=="SENT")throw new Error("Only a current final quotation awaiting your decision can be accepted or rejected.");if(row.validUntil<new Date())throw new Error("This quotation has expired. Ask our team to issue an updated final quotation.");const now=new Date();await tx.quotation.update({where:{id},data:{status:decision,acceptedAt:decision==="ACCEPTED"?now:null,acceptedVersion:decision==="ACCEPTED"?row.version:null,acceptedAmount:decision==="ACCEPTED"?row.grandTotal:null,acceptedById:decision==="ACCEPTED"?user.id:null,acceptanceMetadata:decision==="ACCEPTED"?{acceptedAt:now.toISOString(),version:row.version,amount:row.grandTotal.toString(),userAgent:requestHeaders.get("user-agent"),forwardedFor:requestHeaders.get("x-forwarded-for")}:undefined}});await tx.quotationStatusHistory.create({data:{quotationId:id,fromStatus:row.status,toStatus:decision,actorId:user.id,note:decision==="ACCEPTED"?`Customer accepted final version ${row.version} for R ${row.grandTotal.toString()}.`:"Customer rejected final quotation."}});await tx.auditLog.create({data:{actorId:user.id,action:`quotation.customer-${decision.toLowerCase()}`,entityType:"Quotation",entityId:id,before:{status:row.status},after:{status:decision,version:row.version,amount:row.grandTotal.toString()}}});return row});try{await enqueueEmail(emailTemplates.quotationDecision(user.email,quote.quotationRequest?.contactName??user.name??"Customer",quote.quotationNumber,decision,quote.grandTotal.toString(),quote.version),user.id)}catch(error){console.error("Quotation decision email queued for retry",error)}revalidatePath("/account/quotations");
}
