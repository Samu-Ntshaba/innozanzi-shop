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
    const webhook = readFileSync("src/domain/payments/finalize.ts", "utf8");
    const alert = readFileSync("src/domain/notifications/order-alerts.ts", "utf8");
    expect(webhook).toContain('event.status === "PAID"');
    expect(webhook).toContain("notifyStaffOfPaidOrder(result.order.id)");
    expect(alert).toContain("sendPaidOrderConfirmation(orderId)");
    expect(readFileSync("src/domain/notifications/customer-order.ts","utf8")).toContain('order.status === "PROCESSING"');
    expect(readFileSync("src/domain/notifications/customer-order.ts","utf8")).toContain("emailTemplates.orderStatus");
    expect(alert).toContain('sendStaffEmail("ORDER_PAID"');
    expect(webhook).toContain('status: "CONVERTED"');
  });

  it("keeps the owned payment return page available while verification completes", () => {
    const page = readFileSync("src/app/account/orders/[orderNumber]/page.tsx", "utf8");
    expect(page).toContain('const paymentReturn = ["processing", "cancelled", "error"]');
    expect(page).toContain("<PaymentStatusRefresh");
  });
});
