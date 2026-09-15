import { boundedBody } from "@/lib/security/request";
import { verifyApprovedNotification } from "@/integrations/payments/approved-gateways";
import { NextResponse } from "next/server";
import { processPaymentEvent } from "@/domain/payments/webhooks";
import { verifyHostedPaymentWebhook } from "@/domain/payments/orchestration";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { acceptVerifiedPayment } from "@/domain/payments/recovery";
import { paymentFailureCode, recordPaymentDiagnostic } from "@/domain/payments/diagnostics";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const raw=(await params).provider.toUpperCase();
  if(raw!=="PAYSTACK"&&raw!=="YOCO"&&raw!=="OZOW"&&raw!=="PAYFAST") return NextResponse.json({error:"Unsupported provider"},{status:404});
  const correlationId=randomUUID();let paymentId:string|undefined,verified=false;
  try {
    const body=(await boundedBody(request,65536)).toString("utf8");
    if(raw==="OZOW"||raw==="PAYFAST"){
      const fields=new URLSearchParams(body),reference=fields.get(raw==="PAYFAST"?"m_payment_id":"TransactionReference");
      if(reference&&reference.length<=200){const payment=await prisma.payment.findUnique({where:{provider_externalReference:{provider:raw,externalReference:reference}},select:{id:true}});paymentId=payment?.id;}
      if(paymentId)try{await recordPaymentDiagnostic(paymentId,"webhook-received",{provider:raw,correlationId,verified:false});}catch{console.warn("Payment receipt diagnostic unavailable",{correlationId});}
    }
    const signature=request.headers.get(raw==="PAYSTACK"?"x-paystack-signature":"x-yoco-signature");
    const event=raw==="OZOW"||raw==="PAYFAST"?await verifyApprovedNotification(raw,body):verifyHostedPaymentWebhook(raw,body,signature);
    verified=true;
    const result=raw==="OZOW"||raw==="PAYFAST"?await acceptVerifiedPayment(raw,event):await processPaymentEvent(raw,event);
    if(paymentId)try{await recordPaymentDiagnostic(paymentId,"webhook-verified",{provider:raw,correlationId,providerTransactionId:event.eventId});}catch{console.warn("Payment verification diagnostic unavailable",{correlationId});}
    console.info("Payment notification processed",{provider:raw,correlationId,paymentId:result.paymentId,duplicate:result.duplicate});
    return NextResponse.json({received:true,...result});
  }catch(error){
    const reason=paymentFailureCode(error),status=verified||reason==="VERIFICATION_OR_PROCESSING_UNAVAILABLE"?503:400;
    console.warn("Payment notification failed",{provider:raw,correlationId,paymentId,verified,reason,httpStatus:status});
    if(paymentId)try{await recordPaymentDiagnostic(paymentId,"webhook-failed",{provider:raw,correlationId,verified,reason,httpStatus:status});}catch{console.error("Payment diagnostic persistence unavailable",{correlationId});}
    return NextResponse.json({error:verified?"Payment processing will be retried":"Payment notification could not be verified",correlationId},{status});
  }
}
