import { boundedBody } from "@/lib/security/request";
import { verifyApprovedNotification } from "@/integrations/payments/approved-gateways";
import { NextResponse } from "next/server";
import { processPaymentEvent } from "@/domain/payments/webhooks";
import { verifyHostedPaymentWebhook } from "@/domain/payments/orchestration";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try { const raw=(await params).provider.toUpperCase(); if(raw!=="PAYSTACK"&&raw!=="YOCO"&&raw!=="OZOW"&&raw!=="PAYFAST") return NextResponse.json({error:"Unsupported provider"},{status:404}); const body=(await boundedBody(request,65536)).toString("utf8"); const signature=request.headers.get(raw==="PAYSTACK"?"x-paystack-signature":"x-yoco-signature"); const event=raw==="OZOW"||raw==="PAYFAST"?await verifyApprovedNotification(raw,body):verifyHostedPaymentWebhook(raw,body,signature); const result=await processPaymentEvent(raw,event); return NextResponse.json({received:true,...result}); } catch{return NextResponse.json({error:"Payment notification could not be verified"},{status:400})}
}
