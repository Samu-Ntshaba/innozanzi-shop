import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { HostedPaymentAdapter, EftPaymentAdapter } from "../../src/integrations/payments/adapters";
import { quotationPdf } from "../../src/domain/quotations/pdf";
import { getEmailProvider, MailtrapEmailProvider } from "../../src/integrations/email/provider";
import { emailTemplates } from "../../src/integrations/email/templates";

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

describe("transactional email", () => {
  it("never selects Mailtrap Sandbox in production", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("MAILTRAP_SANDBOX", "true"); vi.stubEnv("MAILTRAP_SMTP_PASSWORD", ""); vi.stubEnv("MAILTRAP_API_TOKEN", "live-token");
    expect(getEmailProvider()).toBeInstanceOf(MailtrapEmailProvider);
    vi.unstubAllEnvs();
  });
  it("renders branded verification links without exposing raw HTML", () => {
    const email = emailTemplates.verifyEmail("buyer@example.com", "A & B", "secure-token");
    expect(email.html).toContain("A &amp; B");
    expect(email.html).toContain("verify-email?email=buyer%40example.com");
    expect(email.html).toContain("/uploads/brand/email-logo-white.png");
    expect(email.text).toContain("secure-token");
  });

  it("sends Mailtrap's transactional payload and returns the message id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, message_ids: ["message-1"] }), { status: 200, headers: { "content-type": "application/json" } }));
    const provider = new MailtrapEmailProvider("test-token", "sender@example.com", "Sender");
    const result = await provider.send({ to: "buyer@example.com", subject: "Test", text: "Text", html: "<p>Text</p>", idempotencyKey: "test-1" });
    expect(result.messageId).toBe("message-1");
    expect(fetchMock).toHaveBeenCalledWith("https://send.api.mailtrap.io/api/send", expect.objectContaining({ method: "POST" }));
    fetchMock.mockRestore();
  });
});
