import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  orderFindMany: vi.fn(),
  orderFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findMany: mocks.orderFindMany,
      findFirst: mocks.orderFindFirst,
    },
  },
}));

import {
  partnerOrder,
  partnerOrders,
} from "@/domain/partner-sales/orders";

const PARTNERSHIP_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_PARTNERSHIP_ID = "22222222-2222-4222-8222-222222222222";
const ORDER_ID = "33333333-3333-4333-8333-333333333333";
const context = { partnership: { id: PARTNERSHIP_ID } };

const orderRow = {
  id: ORDER_ID,
  orderNumber: "ORD-PARTNER-001",
  status: "IN_TRANSIT",
  customerVisibleNotes: "Your order is on the way.",
  items: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      productName: "Laptop",
      sku: "LAPTOP-1",
      variantName: null,
      quantity: 1,
      unitPrice: "12000",
      lineTotal: "12000",
      costPrice: "9000",
      supplierId: "supplier-secret",
      markupPercent: "33",
      internalNote: "private",
    },
  ],
  shipments: [
    {
      id: "55555555-5555-4555-8555-555555555555",
      status: "IN_TRANSIT",
      carrier: "Courier",
      trackingNumber: "TRACK-1",
      trackingUrl: "https://tracking.example/1",
      estimatedDeliveryAt: new Date("2026-09-28T10:00:00.000Z"),
      procurement: { supplier: { companyName: "Secret Supplier" } },
    },
    {
      id: "66666666-6666-4666-8666-666666666666",
      status: "PENDING",
      carrier: null,
      trackingNumber: null,
      trackingUrl: null,
      estimatedDeliveryAt: null,
      procurement: { supplier: { companyName: "Another Secret Supplier" } },
    },
  ],
  partnerQuoteCase: {
    caseNumber: "PC-001",
    partnershipId: PARTNERSHIP_ID,
  },
  partnerCommission: {
    id: "77777777-7777-4777-8777-777777777777",
    status: "PENDING_COMPLETION",
    method: "PERCENTAGE",
    currentAmount: "900",
    quotedAmount: "900",
    currency: "ZAR",
    calculationSnapshot: { floor: "1000", margin: "7" },
  },
  payment: { status: "PAID", gatewayEvidence: { raw: "secret" } },
};

describe("partner order visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.orderFindMany.mockResolvedValue([orderRow]);
    mocks.orderFindFirst.mockResolvedValue(orderRow);
  });

  it("scopes list and detail queries to the selected partnership", async () => {
    await partnerOrders(context);
    await partnerOrder(context, orderRow.orderNumber);

    expect(mocks.orderFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { partnerQuoteCase: { partnershipId: PARTNERSHIP_ID } },
    }));
    expect(mocks.orderFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { orderNumber: orderRow.orderNumber, partnerQuoteCase: { partnershipId: PARTNERSHIP_ID } },
    }));

    await partnerOrders({ partnership: { id: OTHER_PARTNERSHIP_ID } });
    expect(mocks.orderFindMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { partnerQuoteCase: { partnershipId: OTHER_PARTNERSHIP_ID } },
    }));
  });

  it("returns one redacted order with customer milestones, all supplier shipments, and commission state", async () => {
    const [result] = await partnerOrders(context);
    expect(result).toMatchObject({
      id: ORDER_ID,
      orderNumber: "ORD-PARTNER-001",
      status: "IN_TRANSIT",
      statusLabel: "Shipped",
      caseNumber: "PC-001",
      items: [{ productName: "Laptop", unitPrice: "12000", lineTotal: "12000" }],
      shipments: [
        { trackingNumber: "TRACK-1", carrier: "Courier" },
        { status: "PENDING" },
      ],
      commission: { status: "PENDING_COMPLETION", currentAmount: "900", currency: "ZAR" },
    });
    expect(JSON.stringify(result)).not.toMatch(/cost|margin|supplier|internalNote|gatewayEvidence|payment/i);
  });

  it("preserves cancelled and refunded customer-facing states", async () => {
    mocks.orderFindMany.mockResolvedValue([
      { ...orderRow, status: "CANCELLED", shipments: [], partnerCommission: null },
      { ...orderRow, status: "REFUNDED", shipments: [], partnerCommission: { ...orderRow.partnerCommission, status: "REVERSED", currentAmount: "0" } },
    ]);

    await expect(partnerOrders(context)).resolves.toMatchObject([
      { status: "CANCELLED", commission: null },
      { status: "REFUNDED", commission: { status: "REVERSED", currentAmount: "0" } },
    ]);
  });

  it("keeps operational order controls in Orders while exposing partner case links in both admin views", () => {
    const desktop = readFileSync("src/app/admin/orders/[id]/page.tsx", "utf8");
    const mobile = readFileSync("src/app/mobile-admin/orders/[id]/page.tsx", "utf8");
    for (const source of [desktop, mobile]) {
      expect(source).toContain("/admin/partnerships/sales-cases/");
      expect(source).toContain("Commission");
      expect(source).toContain("partnerQuoteCase");
    }
    expect(readFileSync("src/app/account/partner/orders/page.tsx", "utf8")).toContain("/account/partner/orders/");
    expect(readFileSync("src/app/account/partner/orders/[orderNumber]/page.tsx", "utf8")).toContain("Tracking");
  });
});
