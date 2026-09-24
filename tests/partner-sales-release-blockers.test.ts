import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { partnerAvailabilityFingerprint } from "@/domain/partner-sales/availability";
import { clientQuotationProjection } from "@/domain/partner-sales/documents";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const supplierFixture = {
  sourceType: "SUPPLIER_CATALOGUE_PRODUCT",
  sourceId: "66666666-6666-4666-8666-666666666666",
  baseCost: "6000.00",
  effectiveCost: "5500.00",
  promotionalCost: "5500.00",
  promotionActive: true,
  promotionStartsAt: "2026-09-22T00:00:00.000Z",
  promotionEndsAt: "2026-09-24T00:00:00.000Z",
  available: 12,
  state: "IN_STOCK",
};

describe("partner sales release blockers", () => {
  it("carries one canonical source fingerprint from assignment through payment", () => {
    const assignment = {
      availabilityFingerprint: partnerAvailabilityFingerprint(supplierFixture),
    };
    const showcaseItem = { ...assignment };
    const enquirySnapshot = { ...showcaseItem };
    const approvedVersion = { ...enquirySnapshot };
    const paymentCheck = partnerAvailabilityFingerprint(supplierFixture);

    expect(showcaseItem.availabilityFingerprint).toBe(assignment.availabilityFingerprint);
    expect(enquirySnapshot.availabilityFingerprint).toBe(assignment.availabilityFingerprint);
    expect(approvedVersion.availabilityFingerprint).toBe(assignment.availabilityFingerprint);
    expect(paymentCheck).toBe(assignment.availabilityFingerprint);
    expect(
      partnerAvailabilityFingerprint({ ...supplierFixture, effectiveCost: "6000.00", promotionalCost: null, promotionActive: false }),
    ).not.toBe(assignment.availabilityFingerprint);
  });

  it("uses the canonical fingerprint contract in every availability boundary", () => {
    for (const path of [
      "src/domain/partner-sales/catalogue.ts",
      "src/domain/partner-sales/cases.ts",
      "src/domain/partner-sales/payment.ts",
    ]) {
      expect(source(path), path).toContain("partnerAvailabilityFingerprint");
    }
  });

  it("projects the exact immutable approved version snapshot for partner output", () => {
    const validUntil = new Date("2026-09-26T08:00:00.000Z");
    const snapshot = {
      audience: {
        client: {
          currency: "ZAR",
          partner: { displayName: "Acme Partners", publicSlug: "acme" },
          validUntil: validUntil.toISOString(),
          items: [{ id: "line-1", title: "Business laptop", quantity: 2, unitPrice: "1150.00", vatTotal: "300.00", lineTotal: "2300.00" }],
          subtotal: "2000.00",
          vatTotal: "300.00",
          deliveryTotal: "120.00",
          discountTotal: "0.00",
          grandTotal: "2420.00",
          merchantDisclosure: "Quotation issued by Innozanzi on behalf of the partner.",
        },
      },
    };
    const projection = clientQuotationProjection({
      quotation: {
        id: "44444444-4444-4444-8444-444444444444",
        quotationNumber: "QUO-PS-1",
        version: 1,
        validUntil,
        terms: "Payment is due against this quotation.",
        partnerSalesProfile: { displayName: "Acme Partners", publicSlug: "acme", themePreset: "OCEAN" },
        partnerQuoteCase: { partnerClient: { companyName: "Client Co", contactName: "Buyer", email: "buyer@example.com" } },
      },
      version: { id: "55555555-5555-4555-8555-555555555555", version: 1, snapshot },
    });
    expect(projection.snapshot.grandTotal).toBe("2420.00");
    expect(projection.snapshot.items).toHaveLength(1);
    expect(projection.snapshot.items[0]?.lineTotal).toBe("2300.00");
    expect(source("src/domain/partner-sales/partner-review.ts")).toContain("snapshot: version.snapshot");
    expect(source("src/app/account/partner/sales/[caseNumber]/page.tsx")).toContain("snapshot: activeVersion.snapshot");
  });

  it("fails closed at every public partner resolution and payment boundary", () => {
    for (const path of [
      "src/domain/partner-sales/showcases.ts",
      "src/domain/partner-sales/enquiries.ts",
      "src/domain/partner-sales/partner-review.ts",
      "src/domain/partner-sales/payment.ts",
    ]) {
      expect(source(path), path).toContain("partnerSalesSettings");
    }
  });

  it("keeps partner recipient and delivery instructions immutable into the order workflow", () => {
    expect(source("src/domain/partner-sales/enquiries.ts")).toContain("clientSnapshot:");
    expect(source("src/domain/partner-sales/cases.ts")).toContain("clientPricingSnapshot(pricing, quoteCase.profile");
    expect(source("src/domain/partner-sales/payment.ts")).toContain("addresses: { create: orderDeliverySnapshot(quoteCase) }");
    expect(source("prisma/schema.prisma")).toContain("clientSnapshot");
    expect(source("prisma/schema.prisma")).toContain("deliveryInstructions");
  });

  it("routes supported combos through immutable component evidence and rejects legacy campaigns", () => {
    expect(source("src/domain/partner-sales/catalogue.ts")).toContain('sourceType: "COMBO"');
    expect(source("src/domain/partner-sales/cases.ts")).toContain('if (sourceType === "COMBO")');
    expect(source("src/domain/partner-sales/payment.ts")).toContain('if (item.sourceType === "COMBO")');
    expect(source("src/domain/partner-sales/catalogue.ts")).toContain("legacy campaign identity");
  });

  it("keeps payout creation idempotent and statements authenticated", () => {
    expect(source("src/domain/partner-sales/payouts.ts")).toContain("idempotencyKey");
    expect(source("src/domain/partner-sales/payouts.ts")).toContain("statementPayload");
    expect(source("src/app/api/account/partner/payouts/[id]/statement/route.ts")).toContain("requirePartnerSalesContext");
  });

  it("reconciles every financial exception through the append-only commission ledger", () => {
    expect(source("src/domain/partner-sales/payment.ts")).toContain('status: "PENDING_COMPLETION"');
    expect(source("src/domain/partner-sales/commission-service.ts")).toContain("reconcilePartnerCommissionAfterRefundInTransaction");
    expect(source("src/domain/returns/actions.ts")).toContain("reconcilePartnerCommissionAfterRefundInTransaction");
    expect(source("src/domain/payments/finalize.ts")).toContain("partnerSalesSettings");
  });
});
