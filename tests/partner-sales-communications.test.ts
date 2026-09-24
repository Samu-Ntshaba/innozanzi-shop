import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  stageEmail: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/integrations/email/outbox", () => ({ stageEmail: mocks.stageEmail }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));

import {
  buildPartnerSalesMessages,
  partnerSalesIdempotencyKey,
  stagePartnerSalesEvent,
} from "@/domain/partner-sales/communications";

const base = {
  event: "ENQUIRY_RECEIVED" as const,
  entityId: "case-123",
  caseNumber: "PC-123",
  client: { email: "buyer@example.com", name: "Buyer <script>alert(1)</script>", company: "Acme" },
  partner: { email: "seller@example.com", name: "Seller", displayName: "Partner Co" },
  internalRecipients: [{ email: "ops@example.com", userId: "ops-1" }],
  publicMessage: "Please review this <request>.",
  internalMessage: "Margin 2% / cost R10 / gateway OZOW / supplier secret",
};

describe("partner sales communications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.stageEmail.mockImplementation(async (_db: unknown, message: unknown) => message);
  });

  it("uses stable audience-specific keys and emits every required audience", () => {
    expect(partnerSalesIdempotencyKey("PAYMENT_CONFIRMED", "case-123", "partner")).toBe(
      "partner-sales:PAYMENT_CONFIRMED:case-123:partner",
    );
    const messages = buildPartnerSalesMessages({ ...base, event: "PAYMENT_CONFIRMED", total: "R 1,250.00" });
    expect(messages.map((message) => message.audience)).toEqual(["client", "partner", "internal"]);
    expect(new Set(messages.map((message) => message.message.idempotencyKey)).size).toBe(3);
  });

  it("redacts internal economics from client and partner content while escaping supplied copy", () => {
    const messages = buildPartnerSalesMessages(base);
    for (const message of messages.filter((item) => item.audience !== "internal")) {
      expect(`${message.message.subject}\n${message.message.text}\n${message.message.html}`).not.toMatch(/Margin 2%|cost R10|gateway OZOW|supplier secret/i);
      expect(message.message.html).not.toContain("<script>");
      if (message.audience === "client") expect(message.message.html).toContain("&lt;script&gt;");
    }
    expect(messages.find((item) => item.audience === "internal")?.message.text).toContain("Margin 2%");
  });

  it("does not stage a client message without explicit communication consent", () => {
    const messages = buildPartnerSalesMessages({ ...base, client: { ...base.client, communicationConsent: false } });
    expect(messages.map((message) => message.audience)).not.toContain("client");
  });

  it("stages each audience once and keeps the same key on retries", async () => {
    const db = { notification: {} };
    await stagePartnerSalesEvent(db as never, { ...base, event: "ORDER_DELIVERED" });
    expect(mocks.stageEmail).toHaveBeenCalledTimes(3);
    const keys = mocks.stageEmail.mock.calls.map((call) => call[1].idempotencyKey);
    expect(keys).toEqual([
      "partner-sales:ORDER_DELIVERED:case-123:client",
      "partner-sales:ORDER_DELIVERED:case-123:partner",
      "partner-sales:ORDER_DELIVERED:case-123:internal",
    ]);
    mocks.stageEmail.mockClear();
    await stagePartnerSalesEvent(db as never, { ...base, event: "ORDER_DELIVERED" });
    expect(mocks.stageEmail.mock.calls.map((call) => call[1].idempotencyKey)).toEqual(keys);
  });

  it.each([
    "ENQUIRY_RECEIVED", "PRICING_QUOTATION_READY", "REVISION_REQUESTED", "REVISION_RESOLVED",
    "QUOTATION_SENT", "QUOTATION_EXPIRING_SOON", "QUOTATION_ACCEPTED", "PAYMENT_CONFIRMED",
    "PAYMENT_EXCEPTION", "ORDER_PROCESSING", "ORDER_SHIPPED", "ORDER_OUT_FOR_DELIVERY",
    "ORDER_DELIVERED", "ORDER_CANCELLED", "ORDER_REFUNDED", "COMMISSION_HELD", "COMMISSION_PAYABLE",
    "COMMISSION_INCLUDED_IN_PAYOUT", "COMMISSION_PAID",
  ] as const)("renders the %s event without requiring internal fields", (event) => {
    expect(() => buildPartnerSalesMessages({ ...base, event })).not.toThrow();
  });
});
