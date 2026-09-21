import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

describe("hosted payment visibility in Orders",()=>{
  it("includes hosted attempts by default and selects the latest payment evidence",()=>{
    const queries=source("src/domain/admin/queries.ts");
    expect(queries).toContain('provider:{in:["PAYFAST","OZOW"]}');
    expect(queries).toContain('status:{in:["PENDING","AWAITING_REVIEW","FAILED","CANCELLED"]}');
    expect(queries).toContain('payments:{select:{id:true,provider:true,status:true,externalReference:true,paidAt:true,createdAt:true}');
    expect(queries).not.toContain('payments:{where:{status:{in:["PAID"');
  });

  it("labels unresolved attempts as payment work and links to evidence",()=>{
    const desktop=source("src/app/admin/orders/page.tsx");
    expect(desktop).toContain("Payment confirmation pending");
    expect(desktop).toContain('href="/admin/payments"');
    expect(desktop).toContain("payment?.externalReference");
  });

  it("shows hosted payment attempts in Mobile Admin",()=>{
    const mobile=source("src/app/mobile-admin/orders/page.tsx");
    expect(mobile).toContain('provider:{in:["PAYFAST","OZOW"]}');
    expect(mobile).toContain("Payment confirmation pending");
  });

  it("blocks fulfilment controls until payment is verified",()=>{
    const detail=source("src/app/admin/orders/[id]/page.tsx");
    expect(detail).toContain("Payment confirmation pending");
    expect(detail).toContain("canOperateOrder");
    expect(detail).toContain("/admin/payments");
  });

  it("shows the durable paid-order communication state",()=>{
    const detail=source("src/app/admin/orders/[id]/page.tsx");
    expect(detail).toContain("PAID_ORDER_COMMUNICATION");
    expect(detail).toContain("Paid-order communication:");
  });
});
