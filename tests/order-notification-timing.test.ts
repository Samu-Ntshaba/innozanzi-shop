import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("order notification timing", () => {
  it("does not notify customers or staff before hosted payment is verified", () => {
    const checkout = readFileSync("src/domain/checkout/actions.ts", "utf8");
    expect(checkout).not.toContain("orderPlaced(");
    expect(checkout).not.toContain('sendStaffEmail("ORDER_PLACED"');
    expect(checkout).not.toContain('data:{status:"CONVERTED"}');
  });

  it("notifies customers and staff after a verified paid event", () => {
    const webhook = readFileSync("src/domain/payments/webhooks.ts", "utf8");
    const alert = readFileSync("src/domain/notifications/order-alerts.ts", "utf8");
    expect(webhook).toContain('event.status === "PAID"');
    expect(webhook).toContain("notifyStaffOfPaidOrder(result.order.id)");
    expect(alert).toContain("sendPaidOrderConfirmation(orderId)");
    expect(alert).toContain('sendStaffEmail("ORDER_PAID"');
    expect(webhook).toContain('status: "CONVERTED"');
  });
});
