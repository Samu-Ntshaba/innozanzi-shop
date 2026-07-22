import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { HostedPaymentAdapter, EftPaymentAdapter } from "../../src/integrations/payments/adapters";
import { quotationPdf } from "../../src/domain/quotations/pdf";

describe("payment adapters", () => {
  it("verifies and normalizes a signed hosted-payment webhook", () => {
    const body = JSON.stringify({ id: "evt-1", reference: "paystack-payment-1", status: "success", amount: "120.00" });
    const signature = createHmac("sha256", "secret").update(body).digest("hex");
    const event = new HostedPaymentAdapter("paystack", "secret", "https://checkout.test").verifyWebhook(body, signature);
    expect(event).toMatchObject({ eventId: "evt-1", status: "PAID", amount: "120.00" });
  });
  it("rejects an invalid webhook signature", () => {
    expect(() => new HostedPaymentAdapter("yoco", "secret", "https://checkout.test").verifyWebhook("{}", "bad")).toThrow("Invalid webhook signature");
  });
  it("provides offline EFT instructions", async () => {
    const result = await new EftPaymentAdapter().initialize({ paymentId: "p1", amount: "10", currency: "ZAR", email: "a@example.com", callbackUrl: "https://example.com", idempotencyKey: "k1" });
    expect(result.externalReference).toBe("eft-p1");
    expect(result.instructions).toBeTruthy();
  });
});

describe("quotation PDF", () => {
  it("creates a valid PDF document containing the quote number", () => {
    const pdf = quotationPdf({ quotationNumber: "QUO-100", validUntil: new Date("2026-08-30"), grandTotal: { toString: () => "115.00" }, items: [{ productName: "Laptop", quantity: 1, unitPrice: { toString: () => "115.00" }, lineTotal: { toString: () => "115.00" } }] });
    expect(pdf.subarray(0, 8).toString()).toBe("%PDF-1.4");
    expect(pdf.toString()).toContain("QUO-100");
  });
});
