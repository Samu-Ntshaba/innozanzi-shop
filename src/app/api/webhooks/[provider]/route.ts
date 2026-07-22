import { NextResponse } from "next/server";
import { paymentAdapter } from "@/integrations/payments/adapters";
import { processPaymentEvent } from "@/domain/payments/webhooks";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try { const raw=(await params).provider.toUpperCase(); if(raw!=="PAYSTACK"&&raw!=="YOCO") return NextResponse.json({error:"Unsupported provider"},{status:404}); const body=await request.text(); const signature=request.headers.get(raw==="PAYSTACK"?"x-paystack-signature":"x-yoco-signature"); const event=paymentAdapter(raw).verifyWebhook(body,signature); const result=await processPaymentEvent(raw,event); return NextResponse.json({received:true,...result}); } catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Webhook failed"},{status:400})}
}
