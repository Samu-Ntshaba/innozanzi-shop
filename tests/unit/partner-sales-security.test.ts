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

  it("serializes realistic persisted profile and showcase selections from explicit safe fields", () => {
    const profile = publicPartnerProfileDto({
        id: "profile-1",
        publicSlug: "north-star",
        displayName: "North Star",
        contactEmail: "sales@example.test",
        contactPhone: "011 555 0100",
        footerText: "Authorised Innozanzi sales partner",
        themePreset: "SUNSET",
        cost: "199",
        supplier: { name: "Sensitive supplier", internalNote: "do not disclose" },
      });
    const showcase = publicShowcaseDto({
        publicId: "showcase-1",
        title: "Office refresh",
        introduction: "Selected equipment",
        items: [{
          id: "item-1",
          titleSnapshot: "Laptop",
          presentationCopySnapshot: "Business-ready laptop",
          mediaSnapshot: [{ url: "/laptop.jpg", altText: "Laptop", supplier: { name: "Sensitive" } }],
          cost: "500",
        }],
        gatewayEvidence: { provider: "PayFast" },
      });
    const json = JSON.stringify([profile, showcase]);

    for (const key of forbidden) expect(json).not.toContain(key);
    expect(profile).toMatchObject({ contactEmail: "sales@example.test", contactPhone: "011 555 0100", themePreset: "SUNSET" });
    expect(showcase.items).toEqual([{ id: "item-1", title: "Laptop", presentationCopy: "Business-ready laptop", media: [{ url: "/laptop.jpg", altText: "Laptop" }] }]);
  });

  it("serializes realistic Order items and shipment tracking without internal economics or payment evidence", () => {
    const json = JSON.stringify([
      partnerOrderDto({
        id: "order-1",
        orderNumber: "ORD-1",
        status: "IN_TRANSIT",
        customerVisibleNotes: "Your order is on the way.",
        items: [{ id: "item-1", productName: "Laptop", sku: "LAP-1", variantName: null, quantity: 1, unitPrice: "1000", lineTotal: "1000", costPrice: "700", markupPercent: "20", supplierId: "supplier-1", sourceSnapshot: { internalNote: "do not disclose" } }],
        shipments: [{ id: "shipment-1", status: "IN_TRANSIT", carrier: "Courier", trackingNumber: "TRACK-1", trackingUrl: "https://track.example.test/1", procurement: { supplier: { name: "Private" } } }],
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
    expect(json).toContain("TRACK-1");
    expect(json).toContain("PENDING_COMPLETION");
  });

  it("drops null and non-record media, showcase item, order item, and shipment entries", () => {
    expect(() => publicShowcaseDto({
      publicId: "showcase-1",
      title: "Office refresh",
      items: [null, "not-an-item", { id: "item-1", titleSnapshot: "Laptop", mediaSnapshot: [null, 3, { url: "/laptop.jpg", altText: "Laptop" }] }],
    })).not.toThrow();
    expect(publicShowcaseDto({
      publicId: "showcase-1",
      title: "Office refresh",
      items: [null, "not-an-item", { id: "item-1", titleSnapshot: "Laptop", mediaSnapshot: [null, 3, { url: "/laptop.jpg", altText: "Laptop" }] }],
    }).items).toEqual([{ id: "item-1", title: "Laptop", presentationCopy: null, media: [{ url: "/laptop.jpg", altText: "Laptop" }] }]);
    expect(partnerOrderDto({
      id: "order-1",
      orderNumber: "ORD-1",
      status: "PROCESSING",
      items: [null, 3, { id: "item-1", productName: "Laptop", quantity: 1 }],
      shipments: [null, "bad", { id: "shipment-1", status: "PENDING" }],
    })).toMatchObject({
      items: [{ id: "item-1", productName: "Laptop", quantity: 1 }],
      shipments: [{ id: "shipment-1", status: "PENDING" }],
    });
  });
});
