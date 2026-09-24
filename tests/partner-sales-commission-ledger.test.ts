import { beforeEach, describe, expect, it, vi } from "vitest";
import Decimal from "decimal.js";

const ids = {
  commission: "88888888-8888-4888-8888-888888888888",
  order: "66666666-6666-4666-8666-666666666666",
};

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    partnerCommission: { findUnique: vi.fn(), update: vi.fn() },
    partnerCommissionEntry: { findMany: vi.fn(), create: vi.fn() },
    auditLog: { findFirst: vi.fn(), create: vi.fn() },
    order: { findUnique: vi.fn() },
  };
  return {
    ...tx,
    transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: { ...mocks, $transaction: mocks.transaction } }));

import {
  adjustCommission,
  evaluateCommission,
  holdCommission,
  reverseCommission,
  reconcilePartnerCommissionAfterRefundInTransaction,
  returnRequiresCommissionHold,
} from "@/domain/partner-sales/commission-service";

const commission = {
  id: ids.commission,
  orderId: ids.order,
  status: "PENDING_COMPLETION",
  currentAmount: new Decimal("250.0000"),
  heldAmount: new Decimal("0"),
  adjustedAmount: new Decimal("0"),
  reversedAmount: new Decimal("0"),
  paidAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.$queryRaw.mockResolvedValue([]);
  mocks.partnerCommissionEntry.findMany.mockResolvedValue([]);
  mocks.partnerCommissionEntry.create.mockImplementation(async ({ data }: { data: unknown }) => data);
  mocks.partnerCommission.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...commission, ...data }));
  mocks.partnerCommission.findUnique.mockResolvedValue(commission);
  mocks.order.findUnique.mockResolvedValue({
    id: ids.order,
    status: "PROCESSING",
    paymentStatus: "PAID",
    grandTotal: new Decimal("2875.00"),
    partnerQuoteCase: { status: "PAID" },
    payments: [],
    items: [],
  });
  mocks.auditLog.findFirst.mockResolvedValue(null);
});

describe("partner commission ledger", () => {
  it("does not make an incomplete or unreconciled order payable", async () => {
    const result = await evaluateCommission(ids.order);

    expect(result.eligible).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining(["ORDER_NOT_COMPLETED", "FINANCIAL_RECONCILIATION_PENDING"]));
    expect(mocks.partnerCommission.update).not.toHaveBeenCalled();
  });

  it("makes a completed, paid and reconciled order payable exactly once", async () => {
    mocks.order.findUnique.mockResolvedValue({
      id: ids.order,
      status: "COMPLETED",
      paymentStatus: "PAID",
      grandTotal: new Decimal("2875.00"),
      partnerQuoteCase: { status: "PAID" },
      payments: [],
      items: [],
    });
    mocks.auditLog.findFirst.mockResolvedValue({ id: "audit-1", createdAt: new Date(), after: { profit: "400.00" } });
    mocks.partnerCommission.findUnique
      .mockResolvedValueOnce(commission)
      .mockResolvedValueOnce({ ...commission, status: "PAYABLE" });

    const first = await evaluateCommission(ids.order);
    const second = await evaluateCommission(ids.order);

    expect(first.status).toBe("PAYABLE");
    expect(second.status).toBe("PAYABLE");
    expect(mocks.partnerCommission.update).toHaveBeenCalled();
    expect(mocks.partnerCommissionEntry.create).not.toHaveBeenCalled();
  });

  it("holds with an audit reason and leaves the amount intact", async () => {
    const result = await holdCommission(ids.commission, "Customer dispute requires review", "user-1");

    expect(result.status).toBe("HELD");
    expect(mocks.partnerCommission.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "HELD", heldAmount: new Decimal("250.0000") }) }));
    expect(mocks.partnerCommissionEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: "HOLD", amount: new Decimal("0.0000"), balanceAfter: new Decimal("250.0000") }) }));
  });

  it("uses exact Decimal deltas for adjustments and post-payout reversals", async () => {
    await adjustCommission(ids.commission, "12.3456", "Approved finance correction", "user-1");
    mocks.partnerCommission.findUnique.mockResolvedValue({ ...commission, status: "PAID", currentAmount: new Decimal("262.3456"), paidAt: new Date() });
    await reverseCommission(ids.commission, "62.3456", "Refund after payout", "user-1");

    expect(mocks.partnerCommissionEntry.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ type: "ADJUSTMENT", amount: new Decimal("12.3456"), balanceAfter: new Decimal("262.3456") }) }));
    expect(mocks.partnerCommissionEntry.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: expect.objectContaining({ type: "CORRECTION", amount: new Decimal("-62.3456"), balanceAfter: new Decimal("200.0000") }) }));
    expect(mocks.partnerCommissionEntry.create.mock.calls[1][0].data.type).not.toBe("PAYMENT");
  });

  it("reverses only the delta when repeated refund notifications are cumulative", async () => {
    const base = { ...commission, quotedAmount: new Decimal("250.0000") };
    mocks.partnerCommission.findUnique.mockResolvedValue(base);
    mocks.partnerCommissionEntry.findMany.mockImplementation(async () => mocks.partnerCommissionEntry.create.mock.calls.length
      ? [{ type: "REVERSAL", amount: new Decimal("-62.5000") }]
      : []);

    await reconcilePartnerCommissionAfterRefundInTransaction(mocks as never, {
      orderId: ids.order,
      refundAmount: "250.00",
      capturedAmount: "1000.00",
      reason: "First partial refund",
      eventKey: "refund:1",
    });
    await reconcilePartnerCommissionAfterRefundInTransaction(mocks as never, {
      orderId: ids.order,
      refundAmount: "500.00",
      capturedAmount: "1000.00",
      reason: "Cumulative refund update",
      eventKey: "refund:2",
    });

    expect(mocks.partnerCommissionEntry.create).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "REVERSAL", amount: new Decimal("-62.5000") }),
    }));
  });

  it.each([
    [{ status: "RESOLVED", resolutionStatus: "IN_PROGRESS", refundStatus: "NOT_REQUIRED" }, true],
    [{ status: "CLOSED", resolutionStatus: "COMPLETED", refundStatus: "COMPLETED" }, false],
    [{ status: "CLOSED", resolutionStatus: "COMPLETED", refundStatus: "AWAITING_PAYMENT" }, true],
    [{ status: "REJECTED", resolutionStatus: "REJECTED", refundStatus: "NOT_REQUIRED" }, false],
  ])("holds commission until a return has a closed financial outcome (%o)", (input, expected) => {
    expect(returnRequiresCommissionHold(input)).toBe(expected);
  });
});
