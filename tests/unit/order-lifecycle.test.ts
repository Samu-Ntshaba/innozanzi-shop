import { describe, expect, it } from "vitest";
import { activeOrderJourney, allowedOrderTransitions, assertOrderTransition, cancellationRequiresFinanceConfirmation, deriveOrderStatusFromSupplierGroups, reservationAfterRelease } from "../../src/domain/orders/lifecycle";

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
});
