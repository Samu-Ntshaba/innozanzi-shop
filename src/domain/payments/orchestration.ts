import { gatewayConfigured } from "@/integrations/payments/approved-gateways";
import Decimal from "decimal.js";
import { paymentAdapter } from "@/integrations/payments/adapters";
import type { PaymentSession } from "@/integrations/payments/provider";
import { prisma } from "@/lib/prisma";
import { assertPaymentEventMatches,assertPaymentReference } from "./validation";

type HostedProvider="PAYSTACK"|"YOCO";

export async function beginHostedOrderPayment(input:{paymentId:string;callbackUrl:string}):Promise<PaymentSession>{
  const payment=await prisma.payment.findUnique({where:{id:input.paymentId},include:{order:{select:{email:true}}}});
  if(!payment||payment.provider==="EFT"||payment.provider==="MANUAL")throw new Error("Hosted payment not found");
  if(payment.status!=="PENDING")throw new Error("This payment is no longer pending");
  if(payment.currency!=="ZAR"||new Decimal(payment.amount).lte(0))throw new Error("Invalid payment amount or currency");
  if(payment.provider==="OZOW"||payment.provider==="PAYFAST"){
    if(!gatewayConfigured(payment.provider))throw new Error("This payment method is not available yet.");
    await prisma.payment.update({where:{id:payment.id},data:{externalReference:payment.id}});
    return {externalReference:payment.id,redirectUrl:`/pay/${payment.id}`};
  }
  throw new Error("This payment provider is retired for new payments.");

}

export async function verifyHostedPaymentReturn(provider:HostedProvider,reference:string){
  assertPaymentReference(reference);const adapter=paymentAdapter(provider);
  if(!adapter.verify)throw new Error("Provider return verification is unavailable");
  const event=await adapter.verify(reference),payment=await prisma.payment.findUnique({where:{provider_externalReference:{provider,externalReference:event.externalReference}},select:{externalReference:true,amount:true}});
  if(!payment)throw new Error("Unknown payment reference");assertPaymentEventMatches(event,payment);return event;
}

export function verifyHostedPaymentWebhook(provider:HostedProvider,body:string,signature:string|null){
  if(!body||body.length>1_000_000)throw new Error("Invalid webhook body");
  return paymentAdapter(provider).verifyWebhook(body,signature);
}
