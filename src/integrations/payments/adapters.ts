import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentEvent, PaymentInitialization, PaymentProviderAdapter } from "./provider";

function verifyHmac(body: string, signature: string | null, secret: string) { if (!signature) throw new Error("Missing webhook signature"); const expected = createHmac("sha256", secret).update(body).digest("hex"); const a=Buffer.from(expected); const b=Buffer.from(signature.replace(/^sha256=/,"")); if(a.length!==b.length||!timingSafeEqual(a,b)) throw new Error("Invalid webhook signature"); }
function normalize(body: string): PaymentEvent { const value=JSON.parse(body) as Record<string, unknown>; return { eventId: String(value.eventId??value.id), externalReference: String(value.reference??value.externalReference), status: value.status==="success"||value.status==="paid"?"PAID":value.status==="cancelled"?"CANCELLED":"FAILED", amount: value.amount?String(value.amount):undefined, raw:value }; }

export class HostedPaymentAdapter implements PaymentProviderAdapter {
  constructor(private name: "paystack"|"yoco", private secret: string, private baseUrl: string) {}
  async initialize(input: PaymentInitialization) { return { externalReference: `${this.name}-${input.paymentId}`, redirectUrl: `${this.baseUrl}?reference=${encodeURIComponent(input.paymentId)}&amount=${encodeURIComponent(input.amount)}&callback=${encodeURIComponent(input.callbackUrl)}` }; }
  verifyWebhook(body:string, signature:string|null){verifyHmac(body,signature,this.secret);return normalize(body)}
}
export class EftPaymentAdapter implements PaymentProviderAdapter {
  async initialize(input: PaymentInitialization){return{externalReference:`eft-${input.paymentId}`,instructions:process.env.EFT_PAYMENT_INSTRUCTIONS??"Use the order number as your EFT reference."}}
  verifyWebhook(): PaymentEvent { throw new Error("EFT does not accept webhooks") }
}
export function paymentAdapter(provider: "PAYSTACK"|"YOCO"|"EFT"):PaymentProviderAdapter { if(provider==="EFT")return new EftPaymentAdapter(); const name=provider.toLowerCase() as "paystack"|"yoco"; const secret=process.env[`${provider}_WEBHOOK_SECRET`]; if(!secret)throw new Error(`${provider}_WEBHOOK_SECRET is not configured`); return new HostedPaymentAdapter(name,secret,process.env[`${provider}_CHECKOUT_URL`]??`https://payments.example/${name}`); }
