import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertPaymentEventMatches } from "./validation";
import { processPaymentEvent } from "./webhooks";
import type { ApprovedGateway } from "@/integrations/payments/approved-gateways";
import type { PaymentEvent } from "@/integrations/payments/provider";

const savedEvidence=z.object({provider:z.enum(["PAYFAST","OZOW"]),event:z.object({eventId:z.string(),externalReference:z.string(),status:z.enum(["PAID","FAILED","CANCELLED"]),amount:z.string(),currency:z.literal("ZAR"),raw:z.record(z.string(),z.unknown())})});

// Call only after server-side gateway verification. Never accept browser data here.
export async function acceptVerifiedPayment(provider:ApprovedGateway,event:PaymentEvent){
  const payment=await prisma.payment.findUnique({where:{provider_externalReference:{provider,externalReference:event.externalReference}}});
  if(!payment)throw new Error("Unknown payment reference");
  assertPaymentEventMatches(event,payment);
  if(!event.amount||event.currency!=="ZAR")throw new Error("Missing verified amount or currency");
  const hex=createHash("sha256").update(`verified-payment:${provider}:${event.eventId}:${event.status}`).digest("hex");
  const id=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
  // Store only the fields needed to retry, never the signed body or credentials.
  const evidence={provider,event:{eventId:event.eventId,externalReference:event.externalReference,status:event.status,amount:event.amount,currency:"ZAR",raw:{providerId:event.eventId,verification:"SERVER_VERIFIED"}}};
  await prisma.notification.upsert({where:{id},create:{id,type:"VERIFIED_PAYMENT_RECOVERY",channel:"INTERNAL",status:"PENDING",subject:"Verified payment awaiting processing",body:"Retry the verified gateway event",data:evidence},update:{}});
  const result=await processPaymentEvent(provider,event);
  await prisma.notification.update({where:{id},data:{status:"SENT",sentAt:new Date(),error:null}});
  return result;
}

export async function retryVerifiedPayments(limit=25){
  const jobs=await prisma.notification.findMany({where:{type:"VERIFIED_PAYMENT_RECOVERY",status:{in:["PENDING","FAILED"]}},orderBy:{updatedAt:"asc"},take:Math.min(100,Math.max(1,limit))});
  let failed=0;
  for(const job of jobs){
    try{
      const {provider,event}=savedEvidence.parse(job.data);
      await processPaymentEvent(provider,event);
      await prisma.notification.update({where:{id:job.id},data:{status:"SENT",sentAt:new Date(),error:null}});
    }catch{
      failed++;
      await prisma.notification.update({where:{id:job.id},data:{status:"FAILED",error:"Verified payment processing requires retry; inspect payment diagnostics."}});
    }
  }
  return {checked:jobs.length,failed};
}
