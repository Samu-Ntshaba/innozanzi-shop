import { prisma } from "@/lib/prisma";
import { lookupPendingPayment } from "@/integrations/payments/lookup";
import type { ApprovedGateway } from "@/integrations/payments/approved-gateways";
import { acceptVerifiedPayment } from "./recovery";

export type PaymentReturnOutcome="paid"|"processing"|"failed";

// Browser return values are never evidence. This routine only acts on a saved
// payment plus a fresh, authenticated provider lookup.
export async function recoverPaymentAfterReturn(paymentId:string):Promise<PaymentReturnOutcome>{
  const payment=await prisma.payment.findUnique({where:{id:paymentId},select:{status:true,provider:true,externalReference:true,createdAt:true}});
  if(!payment)throw new Error("Unknown payment");
  if(payment.status==="PAID"||payment.status==="REFUNDED"||payment.status==="PARTIALLY_REFUNDED")return "paid";
  if(payment.provider!=="OZOW"&&payment.provider!=="PAYFAST")return "processing";
  if(!payment.externalReference)return "processing";
  try{
    const provider=payment.provider as ApprovedGateway;
    const result=await lookupPendingPayment(provider,payment.externalReference,payment.createdAt);
    if(!result.event)return "processing";
    await acceptVerifiedPayment(provider,result.event);
    return result.event.status==="PAID"?"paid":result.event.status==="FAILED"||result.event.status==="CANCELLED"?"failed":"processing";
  }catch(error){
    console.warn("Payment return recovery remains pending",{paymentId,error:error instanceof Error?error.message:"Unknown provider error"});
    return "processing";
  }
}
