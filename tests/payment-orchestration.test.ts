import { describe,expect,it } from "vitest";
import { assertPaymentEventMatches } from "@/domain/payments/validation";

const payment={externalReference:"IZ-123",amount:{toString:()=>"1099.9000"}};
const event={eventId:"event-1",externalReference:"IZ-123",status:"PAID" as const,amount:"1099.90",raw:{}};

describe("payment orchestration validation",()=>{
  it("accepts the expected reference and exact monetary amount",()=>expect(()=>assertPaymentEventMatches(event,payment)).not.toThrow());
  it("rejects a provider reference that does not belong to the payment",()=>expect(()=>assertPaymentEventMatches({...event,externalReference:"IZ-other"},payment)).toThrow("Payment reference mismatch"));
  it("rejects an amount mismatch before lifecycle processing",()=>expect(()=>assertPaymentEventMatches({...event,amount:"1099.89"},payment)).toThrow("Payment amount mismatch"));
  it("rejects empty provider event identifiers",()=>expect(()=>assertPaymentEventMatches({...event,eventId:""},payment)).toThrow("Invalid payment reference"));
});
