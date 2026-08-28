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
  const provider=payment.provider as HostedProvider,session=await paymentAdapter(provider).initialize({paymentId:payment.id,amount:payment.amount.toString(),currency:payment.currency,email:payment.order.email,callbackUrl:input.callbackUrl,idempotencyKey:payment.idempotencyKey});
  assertPaymentReference(session.externalReference);
  await prisma.payment.update({where:{id:payment.id},data:{externalReference:session.externalReference,providerMetadata:{checkoutInitializedAt:new Date().toISOString(),orchestrator:"INNOZANZI_V1",hostedProvider:provider}}});
  return session;
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
