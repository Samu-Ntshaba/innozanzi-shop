"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

export async function decideFinalQuotation(formData:FormData){
  const{user}=await requireUser();const{id,decision}=z.object({id:z.string().uuid(),decision:z.enum(["ACCEPTED","REJECTED"])}).parse(Object.fromEntries(formData));const requestHeaders=await headers();
  await prisma.$transaction(async tx=>{const quote=await tx.quotation.findFirstOrThrow({where:{id,customerId:user.id}});if(quote.kind!=="FINAL"||quote.status!=="SENT")throw new Error("Only a current final quotation awaiting your decision can be accepted or rejected.");if(quote.validUntil<new Date())throw new Error("This quotation has expired. Ask our team to issue an updated final quotation.");const now=new Date();await tx.quotation.update({where:{id},data:{status:decision,acceptedAt:decision==="ACCEPTED"?now:null,acceptedVersion:decision==="ACCEPTED"?quote.version:null,acceptedAmount:decision==="ACCEPTED"?quote.grandTotal:null,acceptedById:decision==="ACCEPTED"?user.id:null,acceptanceMetadata:decision==="ACCEPTED"?{acceptedAt:now.toISOString(),version:quote.version,amount:quote.grandTotal.toString(),userAgent:requestHeaders.get("user-agent"),forwardedFor:requestHeaders.get("x-forwarded-for")}:undefined}});await tx.quotationStatusHistory.create({data:{quotationId:id,fromStatus:quote.status,toStatus:decision,actorId:user.id,note:decision==="ACCEPTED"?`Customer accepted final version ${quote.version} for R ${quote.grandTotal.toString()}.`:"Customer rejected final quotation."}});await tx.auditLog.create({data:{actorId:user.id,action:`quotation.customer-${decision.toLowerCase()}`,entityType:"Quotation",entityId:id,before:{status:quote.status},after:{status:decision,version:quote.version,amount:quote.grandTotal.toString()}}})});revalidatePath("/account/quotations");
}
