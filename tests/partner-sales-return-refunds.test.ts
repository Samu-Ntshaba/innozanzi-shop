import { beforeEach, describe, expect, it, vi } from "vitest";
import Decimal from "decimal.js";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  refundFindUniqueOrThrow: vi.fn(),
  refundPaymentCreate: vi.fn(),
  refundPaymentFindMany: vi.fn(),
  refundUpdate: vi.fn(),
  caseUpdate: vi.fn(),
  caseEventCreate: vi.fn(),
  auditCreate: vi.fn(),
  paymentFindFirst: vi.fn(),
  transaction: vi.fn(),
  reconcile: vi.fn(),
  enqueueEmail: vi.fn(),
  returnUpdate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/domain/auth/session", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    returnRefund: { findUniqueOrThrow: mocks.refundFindUniqueOrThrow },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/integrations/email/outbox", () => ({ enqueueEmail: mocks.enqueueEmail }));
vi.mock("@/integrations/email/templates", () => ({ emailTemplates: { returnUpdate: mocks.returnUpdate } }));
vi.mock("@/domain/notifications/role-email", () => ({}));
vi.mock("@/domain/partner-sales/commission-service", () => ({
  holdCommissionInTransaction: vi.fn(),
  reconcilePartnerCommissionAfterRefundInTransaction: mocks.reconcile,
}));
vi.mock("@/lib/supabase", () => ({ createSupabaseAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { recordRefundPayment } from "@/domain/returns/actions";

const orderId = "11111111-1111-4111-8111-111111111111";
const refundId = "22222222-2222-4222-8222-222222222222";

const refund = {
  id: refundId,
  returnCaseId: "33333333-3333-4333-8333-333333333333",
  refundNumber: "RFD-1",
  approvedById: "approver",
  status: "AWAITING_PAYMENT",
  approvedAmount: new Decimal("100.00"),
  isTestData: true,
  returnCase: {
    orderId,
    customerId: null,
    customer: null,
    referenceNumber: "RET-1",
    order: { id: orderId, email: "buyer@example.com" },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermission.mockResolvedValue({ user: { id: "processor", email: "finance@example.com" } });
  mocks.refundFindUniqueOrThrow.mockResolvedValue(refund);
  mocks.refundPaymentCreate.mockResolvedValue({ id: "payment-1" });
  mocks.refundUpdate.mockResolvedValue({});
  mocks.caseUpdate.mockResolvedValue({});
  mocks.caseEventCreate.mockResolvedValue({});
  mocks.auditCreate.mockResolvedValue({});
  mocks.paymentFindFirst.mockResolvedValue({ id: "captured", amount: new Decimal("1000.00") });
  mocks.refundPaymentFindMany
    .mockResolvedValueOnce([{ amount: new Decimal("100.00") }])
    .mockResolvedValueOnce([{ amount: new Decimal("100.00") }, { amount: new Decimal("100.00") }]);
  mocks.reconcile
    .mockResolvedValueOnce({ status: "REVERSED" })
    .mockResolvedValueOnce({ status: "CORRECTION" });
  mocks.enqueueEmail.mockResolvedValue(undefined);
  mocks.returnUpdate.mockReturnValue({});
  mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
    returnRefundPayment: { create: mocks.refundPaymentCreate, findMany: mocks.refundPaymentFindMany },
    returnRefund: { update: mocks.refundUpdate },
    returnCase: { update: mocks.caseUpdate },
    returnCaseEvent: { create: mocks.caseEventCreate },
    auditLog: { create: mocks.auditCreate },
    payment: { findFirst: mocks.paymentFindFirst },
  }));
});

describe("cumulative partner return refunds", () => {
  it("passes cumulative completed return payments before and after payout", async () => {
    const form = () => {
      const data = new FormData();
      data.set("refundId", refundId);
      data.set("amount", "100");
      data.set("paidAt", "2026-09-24T10:00:00.000Z");
      data.set("method", "EFT");
      data.set("transactionReference", "REF-100");
      return data;
    };

    await recordRefundPayment(form());
    await recordRefundPayment(form());

    expect(mocks.reconcile).toHaveBeenNthCalledWith(1, expect.anything(), expect.objectContaining({
      orderId,
      refundAmount: new Decimal("100.00"),
      capturedAmount: new Decimal("1000.00"),
    }));
    expect(mocks.reconcile).toHaveBeenNthCalledWith(2, expect.anything(), expect.objectContaining({
      orderId,
      refundAmount: new Decimal("200.00"),
      capturedAmount: new Decimal("1000.00"),
    }));
    expect(mocks.reconcile.mock.results.map((result) => result.value)).toHaveLength(2);
  });
});
