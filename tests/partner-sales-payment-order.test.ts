import { beforeEach, describe, expect, it, vi } from "vitest";
import { partnerAvailabilityFingerprint } from "@/domain/partner-sales/availability";

const ids = {
  case: "33333333-3333-4333-8333-333333333333",
  quotation: "44444444-4444-4444-8444-444444444444",
  version: "55555555-5555-4555-8555-555555555555",
  order: "66666666-6666-4666-8666-666666666666",
  payment: "77777777-7777-4777-8777-777777777777",
  commission: "88888888-8888-4888-8888-888888888888",
};

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRawUnsafe: vi.fn(),
    quotationVersion: { findUnique: vi.fn() },
    partnerQuoteCase: { findUnique: vi.fn(), update: vi.fn() },
    quotation: { update: vi.fn() },
    order: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    payment: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    partnerCommission: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    partnerCommissionEntry: { findFirst: vi.fn(), create: vi.fn() },
    product: { findUnique: vi.fn() },
    supplierCatalogueProduct: { findUnique: vi.fn() },
    quotationStatusHistory: { create: vi.fn() },
    orderStatusHistory: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    ...tx,
    transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: { ...mocks, siteSetting: { findUnique: vi.fn().mockResolvedValue({ value: { enabled: true } }) }, $transaction: mocks.transaction } }));

import {
  PartnerQuotePaymentError,
  createPartnerQuotePayment,
  linkPaidPartnerOrder,
} from "@/domain/partner-sales/payment";

const now = new Date("2026-09-24T08:00:00.000Z");

const sourceFingerprint = partnerAvailabilityFingerprint;

const quoteItems = [
  {
    id: "item-1",
    productId: "product-1",
    productName: "Business laptop",
    sku: "LAP-1",
    quantity: 2,
    unitPrice: "1150.00",
    costPrice: "900.00",
    discountTotal: "0.00",
    vatRate: "0.1304",
    vatTotal: "300.00",
    lineTotal: "2300.00",
    sourceType: "PRODUCT",
    sourceId: "product-1",
    sourceSnapshot: { availabilityFingerprint: sourceFingerprint({ sourceType: "PRODUCT", sourceId: "product-1", baseCost: "900.00", effectiveCost: "900.00", available: 10, state: "IN_STOCK", details: { costEvidence: [{ id: "base", available: 10, cost: "900.0000" }] } }) },
    stockSnapshot: 10,
  },
  {
    id: "item-2",
    productId: null,
    productName: "Supplier monitor",
    sku: "MON-1",
    quantity: 1,
    unitPrice: "575.00",
    costPrice: "450.00",
    discountTotal: "0.00",
    vatRate: "0.1304",
    vatTotal: "75.00",
    lineTotal: "575.00",
    sourceType: "SUPPLIER_CATALOGUE_PRODUCT",
    sourceId: "supplier-product-1",
    sourceSnapshot: { availabilityFingerprint: sourceFingerprint({ sourceType: "SUPPLIER_CATALOGUE_PRODUCT", sourceId: "supplier-product-1", baseCost: "450.00", effectiveCost: "450.00", available: 4, state: "IN_STOCK" }) },
    stockSnapshot: 4,
  },
];

const quote = {
  id: ids.quotation,
  quotationNumber: "QUO-PS-1",
  status: "ACCEPTED",
  kind: "FINAL",
  version: 3,
  acceptedVersion: 3,
  acceptedAmount: "2875.00",
  currency: "ZAR",
  subtotal: "2500.00",
  discountTotal: "0.00",
  deliveryTotal: "0.00",
  vatTotal: "375.00",
  grandTotal: "2875.00",
  validUntil: new Date("2026-09-26T08:00:00.000Z"),
  convertedOrderId: null,
  items: quoteItems,
  partnerQuoteCase: {
    id: ids.case,
    status: "PAYMENT_PENDING",
    activeQuotationId: ids.quotation,
    acceptedQuotationId: ids.quotation,
    acceptedQuotationVersionId: ids.version,
    partnerClient: {
      companyName: "Client Co",
      contactName: "Buyer",
      email: "buyer@example.com",
      phone: "+27821234567",
      vatNumber: "4123456789",
      deliveryAddress: null,
    },
  },
};

const version = { id: ids.version, quotationId: ids.quotation, version: 3, quotation: quote };

function liveSources() {
  mocks.product?.findUnique?.mockResolvedValue({
    costPrice: "900.00",
    stockStatus: "IN_STOCK",
    inventory: [{ onHand: 12, reserved: 2 }],
  });
  mocks.supplierCatalogueProduct?.findUnique?.mockResolvedValue({
    costPrice: "450.00",
    stock: 4,
    availability: "IN_STOCK",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.quotationVersion.findUnique.mockResolvedValue(version);
  mocks.partnerQuoteCase.findUnique.mockResolvedValue(quote.partnerQuoteCase);
  mocks.order.findFirst.mockResolvedValue(null);
  mocks.payment.findFirst.mockResolvedValue(null);
  mocks.order.create.mockResolvedValue({ ...quote, id: ids.order, orderNumber: "ORD-PS-1", partnerQuoteCaseId: ids.case });
  mocks.payment.create.mockResolvedValue({ id: ids.payment, orderId: ids.order, provider: "PAYFAST", amount: "2875.00", currency: "ZAR", status: "PENDING" });
  mocks.partnerCommission.findUnique.mockResolvedValue({ id: ids.commission, status: "ESTIMATED", currentAmount: "250.00", orderId: null });
  mocks.partnerCommissionEntry.findFirst.mockResolvedValue(null);
  liveSources();
});

describe("partner quote payment intent", () => {
  it("creates one anonymous payment/order for PayFast and preserves every approved line, including supplier lines", async () => {
    const result = await createPartnerQuotePayment(ids.version, "PAYFAST", now);

    expect(result).toMatchObject({ paymentId: ids.payment, orderId: ids.order, provider: "PAYFAST", amount: "2875.00", currency: "ZAR" });
    expect(mocks.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: null,
        partnerQuoteCaseId: ids.case,
        paymentMethod: "PAYFAST",
        items: { create: expect.arrayContaining([
          expect.objectContaining({ productName: "Business laptop", quantity: 2, unitPrice: "1150.00", lineTotal: "2300.00" }),
          expect.objectContaining({ sourceType: "SUPPLIER_CATALOGUE_PRODUCT", sourceId: "supplier-product-1", quantity: 1, unitPrice: "575.00" }),
        ]) },
      }),
    }));
    expect(mocks.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ provider: "PAYFAST", amount: "2875.00", currency: "ZAR", idempotencyKey: `partner-quote:${ids.version}:PAYFAST` }),
    }));
  });

  it("supports Ozow with the same exact accepted snapshot and converges repeated intent creation", async () => {
    mocks.payment.create.mockResolvedValueOnce({ id: ids.payment, orderId: ids.order, provider: "OZOW", amount: "2875.00", currency: "ZAR", status: "PENDING" });
    const first = await createPartnerQuotePayment(ids.version, "OZOW", now);
    mocks.order.findFirst.mockResolvedValue({ id: ids.order, orderNumber: "ORD-PS-1" });
    mocks.payment.findFirst.mockResolvedValue({ id: ids.payment, orderId: ids.order, provider: "OZOW", amount: "2875.00", currency: "ZAR", status: "PENDING" });
    const second = await createPartnerQuotePayment(ids.version, "OZOW", now);

    expect(first).toMatchObject({ provider: "OZOW" });
    expect(second).toMatchObject({ paymentId: ids.payment, orderId: ids.order, provider: "OZOW" });
    expect(mocks.order.create).toHaveBeenCalledTimes(1);
    expect(mocks.payment.create).toHaveBeenCalledTimes(1);
  });

  it("uses the immutable approved version values even if mutable quotation items were changed later", async () => {
    const immutable = {
      audience: {
        internal: {
          items: quoteItems.map((item) => ({ id: item.id, sourceType: item.sourceType, sourceId: item.sourceId, title: item.productName, quantity: item.quantity, cost: item.costPrice, available: item.stockSnapshot, availabilityFingerprint: (item.sourceSnapshot as { availabilityFingerprint: string }).availabilityFingerprint, approvedGrossUnit: item.unitPrice, lineTotal: item.lineTotal, vatTotal: item.vatTotal })),
          totals: { subtotal: "2500.00", discountTotal: "0.00", deliveryTotal: "0.00", vatTotal: "375.00", grandTotal: "2875.00" },
        },
      },
    };
    const changed = { ...version, snapshot: immutable, quotation: { ...quote, items: quoteItems.map((item, index) => index === 0 ? { ...item, unitPrice: "1.00", lineTotal: "2.00" } : item) } };
    mocks.quotationVersion.findUnique.mockResolvedValue(changed);
    await createPartnerQuotePayment(ids.version, "PAYFAST", now);
    expect(mocks.order.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ items: { create: expect.arrayContaining([expect.objectContaining({ unitPrice: "1150.00", lineTotal: "2300.00" })]) } }) }));
  });

  it("blocks expiry, accepted-version/amount mismatch, and live cost or stock drift without rewriting the approved quote", async () => {
    await expect(createPartnerQuotePayment(ids.version, "PAYFAST", new Date("2026-09-27T00:00:00.000Z"))).rejects.toThrow("expired");

    mocks.quotationVersion.findUnique
      .mockResolvedValueOnce({ ...version, quotation: { ...quote, acceptedVersion: 2 } })
      .mockResolvedValueOnce({ ...version, quotation: { ...quote, acceptedVersion: 2 } });
    await expect(createPartnerQuotePayment(ids.version, "PAYFAST", now)).rejects.toThrow("accepted version");

    mocks.quotationVersion.findUnique
      .mockResolvedValueOnce({ ...version, quotation: { ...quote, acceptedAmount: "2800.00" } })
      .mockResolvedValueOnce({ ...version, quotation: { ...quote, acceptedAmount: "2800.00" } });
    await expect(createPartnerQuotePayment(ids.version, "PAYFAST", now)).rejects.toThrow("amount");

    mocks.quotationVersion.findUnique.mockResolvedValueOnce(version).mockResolvedValueOnce(version);
    mocks.product.findUnique.mockResolvedValue({ costPrice: "901.00", stockStatus: "IN_STOCK", inventory: [{ onHand: 12, reserved: 2 }] });
    await expect(createPartnerQuotePayment(ids.version, "PAYFAST", now)).rejects.toThrow("changed");
    expect(mocks.quotation.update).not.toHaveBeenCalled();

    mocks.product.findUnique.mockResolvedValue({ costPrice: "900.00", stockStatus: "IN_STOCK", inventory: [{ onHand: 2, reserved: 1 }] });
    await expect(createPartnerQuotePayment(ids.version, "PAYFAST", now)).rejects.toThrow("available");
  });
});

describe("paid partner order link", () => {
  it("locks one case, moves one commission to payment-locked, and is idempotent on replay", async () => {
    const tx = mocks;
    const input = { paymentId: ids.payment, orderId: ids.order, quotationId: ids.quotation, quotationVersionId: ids.version, caseId: ids.case, provider: "PAYFAST" as const, paidAt: now };
    mocks.partnerQuoteCase.findUnique
      .mockResolvedValueOnce({ ...quote.partnerQuoteCase, status: "PAYMENT_PENDING" })
      .mockResolvedValueOnce({ ...quote.partnerQuoteCase, status: "PAID" });
    mocks.partnerCommission.findUnique
      .mockResolvedValueOnce({ id: ids.commission, status: "ESTIMATED", currentAmount: "250.00", orderId: null })
      .mockResolvedValueOnce({ id: ids.commission, status: "LOCKED_ON_PAYMENT", currentAmount: "250.00", orderId: ids.order });
    const first = await linkPaidPartnerOrder(tx as never, input);
    const second = await linkPaidPartnerOrder(tx as never, input);

    expect(first).toMatchObject({ orderId: ids.order, caseId: ids.case, commissionId: ids.commission });
    expect(second).toEqual(first);
    expect(mocks.partnerQuoteCase.update).toHaveBeenCalledTimes(1);
    expect(mocks.partnerCommission.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "LOCKED_ON_PAYMENT", orderId: ids.order }) }));
    expect(mocks.partnerCommissionEntry.create).toHaveBeenCalledTimes(1);
  });
});

describe("partner payment error contract", () => {
  it("exposes a stable repricing error for stale approvals", () => {
    const error = new PartnerQuotePaymentError("The approved quote is stale; request repricing.", "REPRICE_REQUIRED");
    expect(error.code).toBe("REPRICE_REQUIRED");
  });
});
