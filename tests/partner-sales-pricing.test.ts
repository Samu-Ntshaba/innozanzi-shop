import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COMMERCE } from "@/domain/commerce/config";
import { protectedPrice } from "@/domain/commerce/engine";
import {
  calculatePartnerPricing,
  PartnerPricingError,
} from "@/domain/partner-sales/pricing";

const ids = {
  case: "77777777-7777-4777-8777-777777777777",
  quotation: "88888888-8888-4888-8888-888888888888",
};

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRawUnsafe: vi.fn(),
    partnerQuoteCase: { findUnique: vi.fn(), update: vi.fn() },
    quotation: { create: vi.fn(), update: vi.fn() },
    quotationRequest: { update: vi.fn() },
    quotationItem: { createMany: vi.fn(), deleteMany: vi.fn() },
    quotationVersion: { create: vi.fn(), count: vi.fn() },
    partnerCommission: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    partnerCommissionEntry: { create: vi.fn() },
    quotationStatusHistory: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    ...tx,
    transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: { ...mocks, $transaction: mocks.transaction } }));
vi.mock("@/domain/commerce/settings", () => ({
  getCommerceSettings: vi.fn().mockResolvedValue(DEFAULT_COMMERCE),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const item = {
  id: "item-1",
  sourceType: "PRODUCT" as const,
  sourceId: "product-1",
  title: "Business laptop",
  quantity: 1,
  cost: "1000",
  available: 5,
  availabilityFingerprint: "fingerprint-1",
};

describe("partner pricing calculations", () => {
  it("rejects combo and campaign lines before calculating a partner price", () => {
    expect(() => calculatePartnerPricing({
      items: [{ id: "combo", sourceType: "COMBO", sourceId: ids.case, title: "Legacy combo", quantity: 1, cost: "10", available: 1 }],
    })).toThrow(/combo and campaign.*disabled/i);
    expect(() => calculatePartnerPricing({
      items: [{ id: "campaign", sourceType: "CAMPAIGN", sourceId: ids.case, title: "Legacy campaign", quantity: 1, cost: "10", available: 1 }],
    })).toThrow(/combo and campaign.*disabled/i);
  });
  it("keeps the client price at or above the protected floor and includes VAT, delivery, gateway, and reserve inputs", () => {
    const result = calculatePartnerPricing({
      items: [item],
      settings: {
        ...DEFAULT_COMMERCE,
        vatRegistered: true,
        vatPercent: 15,
        reservePercent: 2,
        customerDelivery: 120,
      },
      deliveryTotal: 120,
      gateway: "PAYFAST",
      commissionMethod: "PERCENTAGE",
      commissionValue: 10,
    });

    expect(result.items[0].approvedGrossUnit.gte(result.items[0].protectedGrossUnit)).toBe(true);
    expect(result.vatTotal.gt(0)).toBe(true);
    expect(result.deliveryTotal.eq(120)).toBe(true);
    expect(result.gateway).toBe("PAYFAST");
    expect(result.reserve.gt(0)).toBe(true);
    expect(result.commissionAmount.eq(result.netSale.mul(0.1))).toBe(true);
  });

  it("supports fixed commission defaults and denies negative post-commission contribution", () => {
    const floor = protectedPrice("1000", { ...DEFAULT_COMMERCE, hardwareMinimum: 0, hardwareMargin: 0 }, "PAYFAST").gross;
    const result = calculatePartnerPricing({
      items: [{ ...item, cost: "1000" }],
      settings: { ...DEFAULT_COMMERCE, hardwareMinimum: 0, hardwareMargin: 0 },
      commissionMethod: "FIXED_AMOUNT",
      commissionValue: 10,
      approvedUnitPrices: { "item-1": floor },
    });
    expect(result.commissionAmount.eq(10)).toBe(true);
    expect(result.expectedContribution.gte(0)).toBe(true);

    expect(() => calculatePartnerPricing({
      items: [{ ...item, cost: "1000" }],
      settings: { ...DEFAULT_COMMERCE, hardwareMinimum: 0, hardwareMargin: 0 },
      commissionMethod: "FIXED_AMOUNT",
      commissionValue: result.netSale.mul("0.99"),
      approvedUnitPrices: { "item-1": floor },
    })).toThrow("negative");
  });

  it("requires an explicit reason for a commission override and defaults validity to 48 hours", () => {
    const defaults = calculatePartnerPricing({ items: [item] });
    expect(defaults.validUntil.getTime() - defaults.calculatedAt.getTime()).toBe(48 * 60 * 60 * 1000);
    expect(() => calculatePartnerPricing({
      items: [item],
      commissionMethod: "FIXED_AMOUNT",
      commissionValue: 25,
      defaultCommissionMethod: "PERCENTAGE",
      defaultCommissionValue: 10,
    })).toThrow("reason");
    const override = calculatePartnerPricing({
      items: [item],
      commissionMethod: "FIXED_AMOUNT",
      commissionValue: 25,
      defaultCommissionMethod: "PERCENTAGE",
      defaultCommissionValue: 10,
      commissionOverrideReason: "Strategic account approval",
      validUntil: new Date("2026-10-01T00:00:00.000Z"),
    });
    expect(override.commissionMethod).toBe("FIXED_AMOUNT");
    expect(override.commissionOverrideReason).toContain("Strategic");
  });
});

describe("partner quote approval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.partnerQuoteCase.findUnique.mockResolvedValue({
      id: ids.case,
      caseNumber: "PC-1",
      partnershipId: "11111111-1111-4111-8111-111111111111",
      profileId: "22222222-2222-4222-8222-222222222222",
      partnerClientId: "33333333-3333-4333-8333-333333333333",
      status: "INNOZANZI_REVIEW",
      innozanziOwnerId: null,
      profile: { publicSlug: "acme", displayName: "Acme", defaultCommissionMethod: "PERCENTAGE", defaultCommissionValue: "10" },
      partnerClient: { companyName: "Client", contactName: "Buyer", email: "buyer@example.com" },
      quotationRequest: {
        id: "99999999-9999-4999-8999-999999999999",
        requestNumber: "QR-1",
        contactName: "Buyer",
        email: "buyer@example.com",
        items: [{ id: "item-1", productName: "Business laptop", requestedQuantity: 1, productSnapshot: { sourceType: "PRODUCT", sourceId: "product-1", cost: "1000", available: 5, availabilityFingerprint: "fp-1", currentAvailabilityFingerprint: "fp-1" } }],
      },
      quotations: [],
    });
    mocks.quotation.create.mockResolvedValue({ id: ids.quotation, quotationNumber: "QUO-1", version: 1 });
    mocks.quotationVersion.create.mockResolvedValue({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
    mocks.partnerCommission.create.mockResolvedValue({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" });
    mocks.partnerCommissionEntry.create.mockResolvedValue({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" });
    mocks.transaction.mockImplementation(async (callback: (client: typeof mocks) => unknown) => callback(mocks));
  });

  it("exposes an error type for stale snapshots, self approval, and immutable versions", async () => {
    const { approvePartnerQuotation, quotePartnerCase } = await import("@/domain/partner-sales/cases");
    expect(PartnerPricingError).toBeDefined();
    expect(approvePartnerQuotation).toBeTypeOf("function");
    const actor = { user: { id: "actor-1" }, grants: [{ key: "partner_sales.pricing.approve", effect: "ALLOW" as const }] };
    const preview = await quotePartnerCase(ids.case, actor);
    expect(preview.clientSnapshot).not.toHaveProperty("internal");
    const approved = await approvePartnerQuotation({ caseId: ids.case }, actor);
    expect(approved).toMatchObject({ quotationId: ids.quotation, quotationVersionId: expect.any(String), commissionId: expect.any(String) });
    expect(mocks.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "partner-sales.quotation.approve" }) }));

    mocks.partnerQuoteCase.findUnique.mockResolvedValueOnce({
      ...mocks.partnerQuoteCase.findUnique.mock.results[0]?.value,
      innozanziOwnerId: "owner-1",
    });
    await expect(approvePartnerQuotation({ caseId: ids.case }, { ...actor, user: { id: "owner-1" } })).rejects.toThrow("owner");

    mocks.partnerQuoteCase.findUnique.mockResolvedValueOnce({
      ...await Promise.resolve({
        id: ids.case,
        caseNumber: "PC-1",
        partnershipId: "11111111-1111-4111-8111-111111111111",
        profileId: "22222222-2222-4222-8222-222222222222",
        partnerClientId: "33333333-3333-4333-8333-333333333333",
        status: "INNOZANZI_REVIEW",
        innozanziOwnerId: null,
        profile: { publicSlug: "acme", displayName: "Acme", defaultCommissionMethod: "PERCENTAGE", defaultCommissionValue: "10" },
        partnerClient: { companyName: "Client", contactName: "Buyer", email: "buyer@example.com" },
        quotationRequest: { id: "99999999-9999-4999-8999-999999999999", requestNumber: "QR-1", contactName: "Buyer", email: "buyer@example.com", items: [{ id: "item-1", productName: "Business laptop", requestedQuantity: 1, productSnapshot: { sourceType: "PRODUCT", sourceId: "product-1", cost: "1000", available: 5, availabilityFingerprint: "fp-1", currentAvailabilityFingerprint: "fp-2" } }] },
        quotations: [{ version: 1 }],
      }),
    });
    await expect(approvePartnerQuotation({ caseId: ids.case }, actor)).rejects.toThrow("changed");
  });

  it("re-estimates the existing unpaid commission during a revision without inserting a duplicate", async () => {
    const { approvePartnerQuotation } = await import("@/domain/partner-sales/cases");
    const actor = { user: { id: "actor-1" }, grants: [{ key: "partner_sales.pricing.approve", effect: "ALLOW" as const }] };
    mocks.partnerQuoteCase.findUnique.mockResolvedValue({
      id: ids.case,
      caseNumber: "PC-1",
      partnershipId: "11111111-1111-4111-8111-111111111111",
      profileId: "22222222-2222-4222-8222-222222222222",
      partnerClientId: "33333333-3333-4333-8333-333333333333",
      status: "REVISION_REQUESTED",
      innozanziOwnerId: null,
      profile: { publicSlug: "acme", displayName: "Acme", defaultCommissionMethod: "PERCENTAGE", defaultCommissionValue: "10" },
      partnerClient: { companyName: "Client", contactName: "Buyer", email: "buyer@example.com" },
      quotationRequest: { id: "99999999-9999-4999-8999-999999999999", requestNumber: "QR-1", contactName: "Buyer", email: "buyer@example.com", items: [{ id: "item-1", productName: "Business laptop", requestedQuantity: 1, productSnapshot: { sourceType: "PRODUCT", sourceId: "product-1", cost: "1000", available: 5, availabilityFingerprint: "fp-1", currentAvailabilityFingerprint: "fp-1" } }] },
      quotations: [{ version: 1 }],
    });
    mocks.partnerCommission.findUnique.mockResolvedValue({ id: "existing-commission", status: "ESTIMATED", paidAt: null });
    mocks.partnerCommission.update.mockResolvedValue({ id: "existing-commission" });

    const result = await approvePartnerQuotation({ caseId: ids.case }, actor);

    expect(result.commissionId).toBe("existing-commission");
    expect(mocks.partnerCommission.create).not.toHaveBeenCalled();
    expect(mocks.partnerCommission.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "existing-commission" },
      data: expect.objectContaining({ status: "ESTIMATED", currentAmount: expect.anything() }),
    }));
  });

  it("locks concurrent revisions before re-estimating the single commission obligation", async () => {
    const { approvePartnerQuotation } = await import("@/domain/partner-sales/cases");
    const actor = { user: { id: "actor-1" }, grants: [{ key: "partner_sales.pricing.approve", effect: "ALLOW" as const }] };
    mocks.partnerQuoteCase.findUnique.mockResolvedValue({
      id: ids.case, caseNumber: "PC-1", partnershipId: "11111111-1111-4111-8111-111111111111", profileId: "22222222-2222-4222-8222-222222222222", partnerClientId: "33333333-3333-4333-8333-333333333333", status: "REVISION_REQUESTED", innozanziOwnerId: null,
      profile: { publicSlug: "acme", displayName: "Acme", defaultCommissionMethod: "PERCENTAGE", defaultCommissionValue: "10" }, partnerClient: { companyName: "Client", contactName: "Buyer", email: "buyer@example.com" },
      quotationRequest: { id: "99999999-9999-4999-8999-999999999999", requestNumber: "QR-1", contactName: "Buyer", email: "buyer@example.com", items: [{ id: "item-1", productName: "Business laptop", requestedQuantity: 1, productSnapshot: { sourceType: "PRODUCT", sourceId: "product-1", cost: "1000", available: 5, availabilityFingerprint: "fp-1", currentAvailabilityFingerprint: "fp-1" } }] }, quotations: [{ version: 1 }],
    });
    mocks.partnerCommission.findUnique.mockResolvedValue({ id: "existing-commission", status: "ESTIMATED", paidAt: null });
    mocks.partnerCommission.update.mockResolvedValue({ id: "existing-commission" });

    await Promise.all([approvePartnerQuotation({ caseId: ids.case }, actor), approvePartnerQuotation({ caseId: ids.case }, actor)]);

    expect(mocks.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    expect(mocks.partnerCommission.create).not.toHaveBeenCalled();
    expect(mocks.partnerCommission.update).toHaveBeenCalledTimes(2);
  });
});
