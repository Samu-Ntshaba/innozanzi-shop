import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  settingFindUnique: vi.fn(),
  showcaseFindUnique: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteSetting: { findUnique: mocks.settingFindUnique },
    partnerShowcase: { findUnique: mocks.showcaseFindUnique },
    $transaction: mocks.transaction,
  },
}));

import { resolveShowcaseRecord } from "@/domain/partner-sales/showcases";
import { createPartnerEnquiry, PartnerEnquiryError } from "@/domain/partner-sales/enquiries";
import { resolveClientQuotation, acceptPartnerQuotation, PartnerQuotationError } from "@/domain/partner-sales/partner-review";
import { createPartnerQuotePayment, PartnerQuotePaymentError } from "@/domain/partner-sales/payment";

describe("partner sales global channel kill switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.settingFindUnique.mockResolvedValue({ value: { enabled: false } });
  });

  it("returns not-found resolution and performs no showcase read when disabled", async () => {
    await expect(resolveShowcaseRecord("showcase-1")).resolves.toBeNull();
    expect(mocks.showcaseFindUnique).not.toHaveBeenCalled();
  });

  it("denies enquiry, client quotation acceptance, and payment without mutations when disabled", async () => {
    await expect(createPartnerEnquiry({
      publicId: "showcase-1",
      companyName: "Client Co",
      contactName: "Buyer",
      email: "buyer@example.com",
      items: [{ itemId: "11111111-1111-4111-8111-111111111111", quantity: 1 }],
      destination: "Johannesburg",
      timing: "This month",
      deliveryInstructions: "Call before delivery",
      consent: true,
      idempotencyKey: "idempotency-1",
    })).rejects.toBeInstanceOf(PartnerEnquiryError);
    await expect(resolveClientQuotation("invalid-token")).resolves.toBeNull();
    await expect(acceptPartnerQuotation("invalid-token", { consent: true })).rejects.toBeInstanceOf(PartnerQuotationError);
    await expect(createPartnerQuotePayment("55555555-5555-4555-8555-555555555555", "PAYFAST")).rejects.toBeInstanceOf(PartnerQuotePaymentError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
