import Decimal from "decimal.js";
import type { PaymentEvent } from "@/integrations/payments/provider";

export function assertPaymentReference(value:string){
  if(!value||value.length>180||!/[a-zA-Z0-9]/.test(value))throw new Error("Invalid payment reference");
}

export function assertPaymentEventMatches(event:PaymentEvent,payment:{externalReference:string|null;amount:{toString():string}}){
  assertPaymentReference(event.eventId);assertPaymentReference(event.externalReference);
  if(!payment.externalReference||event.externalReference!==payment.externalReference)throw new Error("Payment reference mismatch");
  if(event.amount!==undefined&&!new Decimal(event.amount).toDecimalPlaces(2).equals(new Decimal(payment.amount.toString()).toDecimalPlaces(2)))throw new Error("Payment amount mismatch");
}
