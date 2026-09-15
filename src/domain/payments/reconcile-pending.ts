import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { lookupPendingPayment } from "@/integrations/payments/lookup";
import { acceptVerifiedPayment, retryVerifiedPayments } from "./recovery";
import { paymentFailureCode, recordPaymentDiagnostic } from "./diagnostics";

export async function reconcilePendingPayments(limit=10){
  const recovered=await retryVerifiedPayments();
  const jobId=randomUUID();
  const payments=await prisma.payment.findMany({where:{provider:{in:["PAYFAST","OZOW"]},OR:[{status:"PENDING"},{status:"PAID",order:{paymentStatus:"PENDING",status:"AWAITING_PAYMENT"},OR:[{failureReason:null},{failureReason:{not:{startsWith:"Payment captured"}}}]}],createdAt:{lte:new Date(Date.now()-2*60_000)},updatedAt:{lte:new Date(Date.now()-5*60_000)},externalReference:{not:null}},orderBy:{updatedAt:"asc"},take:Math.min(25,Math.max(1,limit))});
  let confirmed=0,unresolved=0;
  for(const payment of payments){
    let reason="NO_PROVIDER_CONFIRMATION",providerTransactionId:string|null=null;
    try{
      const result=await lookupPendingPayment(payment.provider as "PAYFAST"|"OZOW",payment.externalReference!,payment.createdAt);
      reason=result.reason;providerTransactionId=result.providerTransactionId??result.event?.eventId??null;
      if(result.event){await acceptVerifiedPayment(payment.provider as "PAYFAST"|"OZOW",result.event);if(result.event.status==="PAID")confirmed++;}
      else unresolved++;
    }catch(error){reason=paymentFailureCode(error);unresolved++;}
    await recordPaymentDiagnostic(payment.id,"reconciliation",{jobId,orderId:payment.orderId,provider:payment.provider,reason,providerTransactionId});
    // Rotate pending attempts fairly; neither timeout nor missing evidence means failed.
    await prisma.payment.updateMany({where:{id:payment.id,status:"PENDING"},data:{failureReason:`Confirmation requires reconciliation: ${reason}`,updatedAt:new Date()}});
    if(payment.status==="PAID")await prisma.payment.updateMany({where:{id:payment.id,status:"PAID"},data:{updatedAt:new Date()}});
  }
  return {jobId,checked:payments.length,confirmed,unresolved,recovered};
}
