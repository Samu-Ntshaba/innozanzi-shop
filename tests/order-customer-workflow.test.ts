import { describe, expect, it } from "vitest";
import { marketingBusinessRules } from "@/config/business-facts";
import { customerOrderStatusLabel, shouldEmailCustomerForOrderStatus } from "@/domain/orders/lifecycle";
import { DEFAULT_ORDER_COMPLETION_WINDOW_DAYS, returnWindowEnd } from "@/domain/orders/settings";

describe("customer order workflow", () => {
  it("uses customer-friendly labels for internal fulfilment states", () => {
    expect(customerOrderStatusLabel("SOURCING_ITEMS")).toBe("Products being prepared");
    expect(customerOrderStatusLabel("DISPATCHED")).toBe("Out for delivery");
    expect(customerOrderStatusLabel("DELIVERED")).not.toBe(customerOrderStatusLabel("COMPLETED"));
  });

  it("emails only meaningful customer order milestones", () => {
    for (const status of ["DISPATCHED", "DELIVERED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"]) expect(shouldEmailCustomerForOrderStatus(status)).toBe(true);
    for (const status of ["AWAITING_PAYMENT", "PAYMENT_VERIFIED", "PROCESSING", "SOURCING_ITEMS", "ITEMS_RECEIVED", "PACKING", "READY_FOR_DELIVERY", "IN_TRANSIT", "COMPLETED"]) expect(shouldEmailCustomerForOrderStatus(status)).toBe(false);
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
