import { describe, expect, it } from "vitest";
import { activeOrderJourney, allowedOrderTransitions, allowedSupplierProgressStatuses, assertOrderTransition, cancellationRequiresFinanceConfirmation, deriveOrderStatusFromSupplierGroups, orderStageContext, reservationAfterRelease, resolveOrderOperation } from "../../src/domain/orders/lifecycle";

describe("paid order fulfilment lifecycle", () => {
  it("allows only controlled forward transitions", () => {
    expect(allowedOrderTransitions("PAYMENT_VERIFIED")).toEqual(["PROCESSING", "CANCELLED"]);
    expect(() => assertOrderTransition("PAYMENT_VERIFIED", "DELIVERED")).toThrow("cannot move");
    expect(allowedOrderTransitions("PROCESSING")).toContain("SOURCING_ITEMS");
    expect(allowedOrderTransitions("SOURCING_ITEMS")).toContain("DISPATCHED");
    expect(() => assertOrderTransition("PROCESSING", "PACKING")).toThrow(/cannot move/i);
    expect(activeOrderJourney).not.toContain("ITEMS_RECEIVED");
    expect(activeOrderJourney).not.toContain("PACKING");
    expect(activeOrderJourney).not.toContain("READY_FOR_DELIVERY");
  });

  it("lets historical warehouse orders escape into distributor dispatch", () => {
    expect(allowedOrderTransitions("ITEMS_RECEIVED")).toContain("DISPATCHED");
    expect(allowedOrderTransitions("PACKING")).toContain("DISPATCHED");
    expect(allowedOrderTransitions("READY_FOR_DELIVERY")).toContain("DISPATCHED");
  });

  it("maps a legacy ready order to an actionable distributor dispatch without changing history",()=>{
    const action=resolveOrderOperation({status:"READY_FOR_DELIVERY",paymentStatus:"PAID",hasSupplierItems:true,groups:[{status:"CONFIRMED",shipmentStatus:"PENDING"}]});
    expect(action).toMatchObject({operationalStatus:"PROCESSING",kind:"RECORD_DISPATCH",label:"Record distributor dispatch"});
    expect(action.normalTransitions).not.toContain("CANCELLED");
  });

  it("gives every healthy paid non-terminal state a successful action",()=>{
    const cases=[
      {status:"PAYMENT_VERIFIED",groups:[]},
      {status:"PROCESSING",groups:[]},
      {status:"SOURCING_ITEMS",groups:[{status:"SUBMITTED",shipmentStatus:null}]},
      {status:"DISPATCHED",groups:[{status:"CONFIRMED",shipmentStatus:"SHIPPED"}]},
      {status:"OUT_FOR_DELIVERY",groups:[{status:"CONFIRMED",shipmentStatus:"OUT_FOR_DELIVERY"}]},
      {status:"DELIVERED",groups:[{status:"CONFIRMED",shipmentStatus:"DELIVERED"}]},
    ];
    for(const value of cases){const result=resolveOrderOperation({paymentStatus:"PAID",hasSupplierItems:true,...value});expect(result.kind,value.status).not.toBe("BLOCKED");expect(result.label,value.status).not.toMatch(/cancel/i);}
  });

  it("identifies an actionable blocker instead of silently dead-ending",()=>{
    expect(resolveOrderOperation({status:"PROCESSING",paymentStatus:"PAID",hasSupplierItems:false,groups:[]})).toMatchObject({kind:"BLOCKED",blocker:"Assign an approved distributor to the order products."});
  });

  it("makes completed and cancelled orders terminal", () => {
    expect(allowedOrderTransitions("COMPLETED")).toEqual([]);
    expect(allowedOrderTransitions("CANCELLED")).toEqual([]);
    expect(() => assertOrderTransition("COMPLETED", "PROCESSING")).toThrow();
  });

  it("permits cancellation only before dispatch and requires finance confirmation", () => {
    expect(cancellationRequiresFinanceConfirmation("PROCESSING")).toBe(true);
    expect(cancellationRequiresFinanceConfirmation("DISPATCHED")).toBe(false);
    expect(cancellationRequiresFinanceConfirmation("DELIVERED")).toBe(false);
  });

  it("derives honest order status across multiple supplier groups", () => {
    expect(deriveOrderStatusFromSupplierGroups(["SHIPPED", "PENDING"])).toBe("PROCESSING");
    expect(deriveOrderStatusFromSupplierGroups(["SHIPPED", "IN_TRANSIT"])).toBe("DISPATCHED");
    expect(deriveOrderStatusFromSupplierGroups(["DELIVERED", "IN_TRANSIT"])).toBe("IN_TRANSIT");
    expect(deriveOrderStatusFromSupplierGroups(["DELIVERED", "OUT_FOR_DELIVERY"])).toBe("OUT_FOR_DELIVERY");
    expect(deriveOrderStatusFromSupplierGroups(["DELIVERED", "DELIVERED"])).toBe("DELIVERED");
  });

  it("releases only inventory that is actually reserved", () => {
    expect(reservationAfterRelease(10, 4)).toBe(6);
    expect(() => reservationAfterRelease(2, 3)).toThrow("cannot be released safely");
    expect(() => reservationAfterRelease(2, 0)).toThrow();
  });

  it("keeps distributor delivery owned by Order operations",()=>{
    expect(orderStageContext("IN_TRANSIT").owner).toBe("Order operations");
    expect(orderStageContext("OUT_FOR_DELIVERY").owner).toBe("Order operations");
  });

  it("only offers the current and valid next supplier stages",()=>{
    expect(allowedSupplierProgressStatuses()).toEqual(["DRAFT","SUBMITTED","CANCELLED"]);
    expect(allowedSupplierProgressStatuses("DRAFT")).toEqual(["DRAFT","SUBMITTED","CANCELLED"]);
    expect(allowedSupplierProgressStatuses("SUBMITTED")).toEqual(["SUBMITTED","CONFIRMED","CANCELLED"]);
    expect(allowedSupplierProgressStatuses("CONFIRMED")).toEqual(["CONFIRMED","RECEIVED","CANCELLED"]);
    expect(allowedSupplierProgressStatuses("RECEIVED")).toEqual(["RECEIVED"]);
    expect(allowedSupplierProgressStatuses("CANCELLED")).toEqual(["CANCELLED"]);
  });
});
