import { NextResponse } from "next/server";
import { PaystackPaymentAdapter } from "@/integrations/payments/adapters";
import { processPaymentEvent } from "@/domain/payments/webhooks";
import { publicSiteUrl } from "@/lib/public-site-url";

const quotationReturn=(status:string)=>new URL(`/account/quotations?online=${status}`,publicSiteUrl());

export async function GET(request:Request){
  const reference=new URL(request.url).searchParams.get("reference");
  if(!reference)return NextResponse.redirect(quotationReturn("missing-reference"));
  try{
    const event=await new PaystackPaymentAdapter().verify(reference);
    await processPaymentEvent("PAYSTACK",event);
    return NextResponse.redirect(quotationReturn(event.status==="PAID"?"paid":"pending"));
  }catch(error){
    console.error("Paystack callback verification failed",error);
    return NextResponse.redirect(quotationReturn("verification-failed"));
  }
}
