import { describe,expect,it } from "vitest";
import { supplierOrderRequestPdf } from "../src/domain/orders/supplier-order-document";

describe("supplier order document",()=>{
  it("lists every supplier SKU even when a buying price still needs confirmation",async()=>{
    const pdf=await supplierOrderRequestPdf({
      orderNumber:"ORD-100",
      createdAt:new Date("2026-08-31T08:00:00Z"),
      items:[
        {name:"Known-cost notebook",sku:"SYN-100",quantity:2,costPrice:"1000",supplierName:"Syntech"},
        {name:"Price-to-confirm memory",sku:"SYN-200",quantity:1,costPrice:null,supplierName:"Syntech"},
      ],
    });
    const content=pdf.toString("latin1");
    expect(content).toContain("%PDF-1.4");
    expect(content).toContain("SYN-100");
    expect(content).toContain("SYN-200");
    expect(content).toContain("TO CONFIRM");
  });
});
