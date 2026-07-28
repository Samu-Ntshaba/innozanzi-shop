import { NextResponse } from "next/server";
import { PaystackPaymentAdapter } from "@/integrations/payments/adapters";
import { processPaymentEvent } from "@/domain/payments/webhooks";

export async function GET(request:Request){
  const reference=new URL(request.url).searchParams.get("reference");
  if(!reference)return NextResponse.redirect(new URL("/account/quotations?online=missing-reference",request.url));
  try{
    const event=await new PaystackPaymentAdapter().verify(reference);
    await processPaymentEvent("PAYSTACK",event);
    return NextResponse.redirect(new URL(`/account/quotations?online=${event.status==="PAID"?"paid":"pending"}`,request.url));
  }catch(error){
    console.error("Paystack callback verification failed",error);
    return NextResponse.redirect(new URL("/account/quotations?online=verification-failed",request.url));
  }
}
