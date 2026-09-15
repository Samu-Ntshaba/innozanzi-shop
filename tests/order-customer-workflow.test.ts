import { describe, expect, it } from "vitest";
import { marketingBusinessRules } from "@/config/business-facts";
import { allowedOrderTransitions, assertOrderTransition, customerOrderStatusLabel, customerOrderPublicNote, defaultOrderTransitionNote, shouldEmailCustomerForOrderStatus } from "@/domain/orders/lifecycle";
import { DEFAULT_ORDER_COMPLETION_WINDOW_DAYS, returnWindowEnd } from "@/domain/orders/settings";

describe("customer order workflow", () => {
  it("uses customer-friendly labels for internal fulfilment states", () => {
    expect(customerOrderStatusLabel("SOURCING_ITEMS")).toBe("Processing");
    expect(customerOrderStatusLabel("DISPATCHED")).toBe("Shipped");
    expect(customerOrderStatusLabel("COMPLETED")).toBe("Delivered");
  });

  it("emails only meaningful customer order milestones", () => {
    for (const status of ["DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"]) expect(shouldEmailCustomerForOrderStatus(status)).toBe(true);
    for (const status of ["AWAITING_PAYMENT", "PAYMENT_VERIFIED", "SOURCING_ITEMS", "ITEMS_RECEIVED", "PACKING", "READY_FOR_DELIVERY", "IN_TRANSIT", "COMPLETED"]) expect(shouldEmailCustomerForOrderStatus(status)).toBe(false);
    expect(shouldEmailCustomerForOrderStatus("PROCESSING")).toBe(true);
  });
  it("provides a complete normal route from paid verification to completion", () => {
    const route = ["PAYMENT_VERIFIED", "PROCESSING", "SOURCING_ITEMS", "DISPATCHED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"];
    for (let index = 0; index < route.length - 1; index++) expect(allowedOrderTransitions(route[index])).toContain(route[index + 1]);
    expect(allowedOrderTransitions("PROCESSING")).toContain("SOURCING_ITEMS");
    expect(allowedOrderTransitions("PROCESSING")).not.toContain("ITEMS_RECEIVED");
    expect(() => assertOrderTransition("PROCESSING", "DELIVERED")).toThrow(/cannot move/i);
  });
  it("does not require improvised customer text for routine milestones", () => {
    expect(defaultOrderTransitionNote("PROCESSING")).toMatch(/processed/i);
    expect(defaultOrderTransitionNote("OUT_FOR_DELIVERY")).toMatch(/out for delivery/i);
  });
  it("defaults the automatic completion window to five days", () => {
    expect(DEFAULT_ORDER_COMPLETION_WINDOW_DAYS).toBe(5);
    expect(returnWindowEnd(new Date("2026-09-01T10:00:00Z"), 5).toISOString()).toBe("2026-09-06T10:00:00.000Z");
  });
  it("anchors generated marketing copy to online-only South African delivery facts", () => {
    expect(marketingBusinessRules).toContain("online store");
    expect(marketingBusinessRules).toContain("national within South Africa only");
    expect(marketingBusinessRules).toContain("Never claim worldwide or international delivery");
  });
});

it("hides historical automated supplier placement details without rewriting the audit trail",()=>{
 expect(customerOrderPublicNote("The supplier order has been placed and your products are being prepared.")).toBe("Your products are being prepared.");
 expect(customerOrderPublicNote("The supplier has confirmed the product order. We will update you when the items are ready for delivery.")).not.toMatch(/supplier/i);
 expect(customerOrderPublicNote("Delivery is delayed by one working day.")).toBe("Delivery is delayed by one working day.");
 expect(customerOrderPublicNote(null)).toBeNull();
});
