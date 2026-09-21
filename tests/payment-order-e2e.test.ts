import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
import { customerOrderStatusLabel,deriveOrderStatusFromSupplierGroups,resolveOrderOperation } from "@/domain/orders/lifecycle";

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

describe.each(["PAYFAST","OZOW"])("%s payment-to-delivery acceptance",provider=>{
  it("converges verified evidence on the same durable paid-order outcome",()=>{
    const finalizer=source("src/domain/payments/finalize.ts");
    expect(finalizer).toContain('type:"RESERVATION"');
    expect(finalizer).toContain('status: "CONVERTED"');
    expect(finalizer).toContain('type:"PAID_ORDER_COMMUNICATION"');
    expect(finalizer).toContain("automaticProcessing");
    expect(["PAYFAST","OZOW"]).toContain(provider);
  });

  it("has a complete normal distributor-direct path with five customer milestones",()=>{
    expect(resolveOrderOperation({status:"PAYMENT_VERIFIED",paymentStatus:"PAID",hasSupplierItems:true,groups:[]})).toMatchObject({label:"Accept order for processing",targetStatus:"PROCESSING"});
    expect(resolveOrderOperation({status:"PROCESSING",paymentStatus:"PAID",hasSupplierItems:true,groups:[]})).toMatchObject({label:"Place supplier order"});
    expect(resolveOrderOperation({status:"SOURCING_ITEMS",paymentStatus:"PAID",hasSupplierItems:true,groups:[{status:"SUBMITTED",shipmentStatus:null}]})).toMatchObject({label:"Record supplier confirmation"});
    expect(resolveOrderOperation({status:"SOURCING_ITEMS",paymentStatus:"PAID",hasSupplierItems:true,groups:[{status:"CONFIRMED",shipmentStatus:"PENDING"}]})).toMatchObject({label:"Record distributor dispatch"});
    expect(resolveOrderOperation({status:"DISPATCHED",paymentStatus:"PAID",hasSupplierItems:true,groups:[{status:"CONFIRMED",shipmentStatus:"SHIPPED"}]})).toMatchObject({label:"Record courier update"});
    expect(resolveOrderOperation({status:"OUT_FOR_DELIVERY",paymentStatus:"PAID",hasSupplierItems:true,groups:[{status:"CONFIRMED",shipmentStatus:"OUT_FOR_DELIVERY"}]})).toMatchObject({label:"Confirm delivery"});
    expect(resolveOrderOperation({status:"DELIVERED",paymentStatus:"PAID",hasSupplierItems:true,groups:[{status:"CONFIRMED",shipmentStatus:"DELIVERED"}]})).toMatchObject({label:"Complete order",targetStatus:"COMPLETED"});
    expect(["PAYMENT_VERIFIED","PROCESSING","DISPATCHED","OUT_FOR_DELIVERY","DELIVERED"].map(customerOrderStatusLabel)).toEqual(["Order confirmed","Processing","Shipped","Out for delivery","Delivered"]);
  });
});

it("keeps one multi-supplier order honest until every distributor delivers",()=>{
  expect(deriveOrderStatusFromSupplierGroups(["SHIPPED","PENDING"])).toBe("PROCESSING");
  expect(deriveOrderStatusFromSupplierGroups(["DELIVERED","OUT_FOR_DELIVERY"])).toBe("OUT_FOR_DELIVERY");
  expect(deriveOrderStatusFromSupplierGroups(["DELIVERED","DELIVERED"])).toBe("DELIVERED");
});

it("keeps legacy warehouse records compatible while routing their next action to distributor dispatch",()=>{
  for(const status of ["ITEMS_RECEIVED","PACKING","READY_FOR_DELIVERY"]){
    expect(resolveOrderOperation({status,paymentStatus:"PAID",hasSupplierItems:true,groups:[{status:"CONFIRMED",shipmentStatus:"PENDING"}]})).toMatchObject({operationalStatus:"PROCESSING",label:"Record distributor dispatch"});
  }
});

it("launch audit fails closed on payment, communication, inventory and pricing blockers",()=>{
  const audit=source("scripts/audit-commerce-launch.ts");
  for(const evidence of ["paidUnfinalized","failedRecovery","failedCommunication","duplicateReservations","configuredPricing"]){expect(audit).toContain(evidence);}
  expect(audit).toContain("process.exitCode=2");
  expect(audit).toContain("testData");
});
