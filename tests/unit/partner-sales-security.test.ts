import { describe, expect, it } from "vitest";
import {
  partnerCommissionDto,
  partnerOrderDto,
  publicPartnerProfileDto,
  publicShowcaseDto,
} from "@/domain/partner-sales/redaction";
import { createPublicToken, hashPublicToken } from "@/domain/partner-sales/tokens";

const forbidden = [
  "cost",
  "floor",
  "margin",
  "supplier",
  "internalNote",
  "gatewayEvidence",
  "gatewayPayload",
  "providerResponse",
] as const;

describe("partner sales security policies", () => {
  it("hashes tokens deterministically while issuing unpredictable plaintext secrets", () => {
    const first = createPublicToken();
    const second = createPublicToken();

    expect(first.plain).not.toBe(second.plain);
    expect(first.hash).toBe(hashPublicToken(first.plain));
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("serializes public partner and showcase DTOs from explicit safe fields", () => {
    const json = JSON.stringify([
      publicPartnerProfileDto({
        id: "profile-1",
        publicSlug: "north-star",
        displayName: "North Star",
        approvedContactEmail: "sales@example.test",
        approvedContactPhone: "011 555 0100",
        footerText: "Authorised Innozanzi sales partner",
        theme: "SUNSET",
        cost: "199",
        supplier: { name: "Sensitive supplier", internalNote: "do not disclose" },
      }),
      publicShowcaseDto({
        publicId: "showcase-1",
        title: "Office refresh",
        introduction: "Selected equipment",
        items: [{ id: "item-1", title: "Laptop", media: [{ url: "/laptop.jpg" }], cost: "500" }],
        gatewayEvidence: { provider: "PayFast" },
      }),
    ]);

    for (const key of forbidden) expect(json).not.toContain(key);
    expect(json).toContain("North Star");
    expect(json).toContain("Office refresh");
  });

  it("serializes partner order and commission DTOs without nested internal economics or payment evidence", () => {
    const json = JSON.stringify([
      partnerOrderDto({
        id: "order-1",
        orderNumber: "ORD-1",
        status: "IN_TRANSIT",
        trackingNumber: "TRACK-1",
        customer: { companyName: "Client Co", internalNote: "VIP" },
        lineItems: [{ title: "Laptop", quantity: 1, cost: "700", margin: "20", supplier: { name: "Private" } }],
        payment: { status: "PAID", gatewayEvidence: { raw: "secret" } },
      }),
      partnerCommissionDto({
        id: "commission-1",
        status: "PENDING_COMPLETION",
        method: "PERCENTAGE",
        currentAmount: "100",
        currency: "ZAR",
        internalNote: "not visible",
        calculationSnapshot: { floor: "500", gatewayPayload: { secret: true } },
      }),
    ]);

    for (const key of forbidden) expect(json).not.toContain(key);
    expect(json).toContain("ORD-1");
    expect(json).toContain("PENDING_COMPLETION");
  });
});
