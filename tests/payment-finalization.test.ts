import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
vi.mock("@/lib/prisma",()=>({prisma:{}}));
vi.mock("@/domain/notifications/order-alerts",()=>({notifyStaffOfPaidOrder:vi.fn()}));
import { finalizeVerifiedPayment } from "@/domain/payments/finalize";
import { processPaymentEvent } from "@/domain/payments/webhooks";

it("exposes one authoritative verified-payment finalizer",()=>{
  expect(processPaymentEvent).toBe(finalizeVerifiedPayment);
});

it("keeps the complete paid-order transaction inside the finalizer boundary",()=>{
  const source=readFileSync("src/domain/payments/finalize.ts","utf8");
  expect(source).toContain("FOR UPDATE");
  expect(source).toContain("gatewayEvent.findUnique");
  expect(source).toContain('type:"RESERVATION"');
  expect(source).toContain('status: "CONVERTED"');
  expect(source).toContain('type:"PAID_ORDER_COMMUNICATION"');
  expect(source).toContain("orderStatusHistory.create");
  expect(source).toContain("deliveryTrackingEvent.create");
  expect(source).toContain('action: "payment.webhook"');
});
