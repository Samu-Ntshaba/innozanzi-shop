import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentEvent, PaymentInitialization, PaymentProviderAdapter } from "./provider";

function verifyHmac(body:string,signature:string|null,secret:string,algorithm:"sha256"|"sha512"="sha256"){
  if(!signature)throw new Error("Missing webhook signature");
  const expected=createHmac(algorithm,secret).update(body).digest("hex");
  const supplied=signature.replace(/^sha(?:256|512)=/,"");
  const a=Buffer.from(expected);const b=Buffer.from(supplied);
  if(a.length!==b.length||!timingSafeEqual(a,b))throw new Error("Invalid webhook signature");
}

type PaystackData={id?:number;status?:string;reference?:string;amount?:number;currency?:string;authorization_url?:string;access_code?:string;gateway_response?:string};
type PaystackResponse={status:boolean;message:string;data?:PaystackData};

async function paystackRequest(path:string,secret:string,init?:RequestInit){
  const response=await fetch(`https://api.paystack.co${path}`,{...init,headers:{Authorization:`Bearer ${secret}`,"Content-Type":"application/json",...(init?.headers??{})},signal:AbortSignal.timeout(20_000)});
  const result=await response.json().catch(()=>({status:false,message:"Invalid response"})) as PaystackResponse;
  if(!response.ok||!result.status)throw new Error(`Paystack request failed: ${result.message}`);
  return result.data??{};
}

export class PaystackPaymentAdapter implements PaymentProviderAdapter{
  constructor(private secret=process.env.PAYSTACK_SECRET_KEY??process.env.PAYSTACK_WEBHOOK_SECRET??""){}
  async initialize(input:PaymentInitialization){
    if(!this.secret)throw new Error("PAYSTACK_SECRET_KEY is not configured");
    const reference=`IZ-${input.paymentId.replaceAll("-","")}`;
    const data=await paystackRequest("/transaction/initialize",this.secret,{method:"POST",body:JSON.stringify({email:input.email,amount:String(Math.round(Number(input.amount)*100)),currency:input.currency,reference,callback_url:input.callbackUrl,metadata:JSON.stringify({paymentId:input.paymentId})})});
    if(!data.authorization_url||!data.reference)throw new Error("Paystack did not return a checkout URL.");
    return{externalReference:data.reference,redirectUrl:data.authorization_url};
  }
  verifyWebhook(body:string,signature:string|null){
    verifyHmac(body,signature,this.secret,"sha512");
    const envelope=JSON.parse(body) as {event?:string;data?:PaystackData};
    const data=envelope.data??{};
    return{eventId:String(data.id??`${envelope.event}:${data.reference}`),externalReference:String(data.reference??""),status:envelope.event==="charge.success"&&data.status==="success"?"PAID":data.status==="abandoned"?"CANCELLED":"FAILED",amount:data.amount===undefined?undefined:String(data.amount/100),raw:envelope} satisfies PaymentEvent;
  }
  async verify(reference:string){
    const data=await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`,this.secret);
    return{eventId:String(data.id??reference),externalReference:String(data.reference??reference),status:data.status==="success"?"PAID":data.status==="abandoned"?"CANCELLED":"FAILED",amount:data.amount===undefined?undefined:String(data.amount/100),raw:data} satisfies PaymentEvent;
  }
  async refund(input:{reference:string;amount:string;customerNote:string;merchantNote:string}){
    return paystackRequest("/refund",this.secret,{method:"POST",body:JSON.stringify({transaction:input.reference,amount:Math.round(Number(input.amount)*100),currency:"ZAR",customer_note:input.customerNote,merchant_note:input.merchantNote})});
  }
}

export class HostedPaymentAdapter implements PaymentProviderAdapter{
  constructor(private name:"paystack"|"yoco",private secret:string,private baseUrl:string){}
  async initialize(input:PaymentInitialization){return{externalReference:`${this.name}-${input.paymentId}`,redirectUrl:`${this.baseUrl}?reference=${encodeURIComponent(input.paymentId)}&amount=${encodeURIComponent(input.amount)}&callback=${encodeURIComponent(input.callbackUrl)}`}}
  verifyWebhook(body:string,signature:string|null):PaymentEvent{verifyHmac(body,signature,this.secret);const value=JSON.parse(body) as Record<string,unknown>;return{eventId:String(value.eventId??value.id),externalReference:String(value.reference??value.externalReference),status:value.status==="success"||value.status==="paid"?"PAID":value.status==="cancelled"?"CANCELLED":"FAILED",amount:value.amount?String(value.amount):undefined,raw:value}}
}
export class EftPaymentAdapter implements PaymentProviderAdapter{
  async initialize(input:PaymentInitialization){return{externalReference:`eft-${input.paymentId}`,instructions:process.env.EFT_PAYMENT_INSTRUCTIONS??"Use the order number as your EFT reference."}}
  verifyWebhook():PaymentEvent{throw new Error("EFT does not accept webhooks")}
}
export function paymentAdapter(provider:"PAYSTACK"|"YOCO"|"EFT"):PaymentProviderAdapter{
  if(provider==="EFT")return new EftPaymentAdapter();
  if(provider==="PAYSTACK")return new PaystackPaymentAdapter();
  const secret=process.env.YOCO_WEBHOOK_SECRET;if(!secret)throw new Error("YOCO_WEBHOOK_SECRET is not configured");
  return new HostedPaymentAdapter("yoco",secret,process.env.YOCO_CHECKOUT_URL??"https://payments.example/yoco");
}
