import { describe,expect,it } from "vitest";
import { emailTemplates } from "../src/integrations/email/templates";

describe("critical order notifications",()=>{
  it("gives the owner searchable product references and a direct action",()=>{
    const message=emailTemplates.paidOrderInternal({id:"order-id",number:"ORD-100",email:"buyer@example.com",phone:"0710000000",total:"1299",paymentMethod:"PAYSTACK",placedAt:new Date("2026-08-28T08:00:00Z"),address:"1 Main Road, Johannesburg",items:[{name:"Example notebook",sku:"SUP-123",source:"SUPPLIER",quantity:1,total:"1299"}]});
    expect(message.subject).toContain("ACTION");
    expect(message.text).toContain("SUP-123");
    expect(message.text).toContain("within 30 minutes");
    expect(message.html).toContain("/admin/orders/order-id");
  });
  it("does not promise delivery before the order is accepted",()=>{
    const message=emailTemplates.paymentReceived("buyer@example.com","ORD-100","1299");
    expect(message.subject).toContain("processed successfully");
    expect(message.text).toContain("awaiting our fulfilment confirmation");
    expect(message.html).toContain("/account/orders/ORD-100");
  });
});
