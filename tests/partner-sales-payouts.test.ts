import { beforeEach, describe, expect, it, vi } from "vitest";
import Decimal from "decimal.js";

const ids = {
  partnership: "11111111-1111-4111-8111-111111111111",
  otherPartnership: "22222222-2222-4222-8222-222222222222",
  commission: "33333333-3333-4333-8333-333333333333",
  secondCommission: "44444444-4444-4444-8444-444444444444",
  batch: "55555555-5555-4555-8555-555555555555",
};

const commission = (overrides: Record<string, unknown> = {}) => ({
  id: ids.commission,
  partnershipId: ids.partnership,
  status: "PAYABLE",
  currentAmount: new Decimal("125.5000"),
  currency: "ZAR",
  ...overrides,
});

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    partnerCommission: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    partnerCommissionEntry: { create: vi.fn() },
    partnerPayoutBatch: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    partnerPayoutItem: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    uploadedDocument: { findUnique: vi.fn(), create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return { ...tx, transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
});

vi.mock("@/lib/prisma", () => ({ prisma: { ...mocks, $transaction: mocks.transaction } }));
vi.mock("@/lib/supabase", () => ({ createSupabaseAdmin: vi.fn(() => ({ storage: { from: vi.fn(() => ({ upload: vi.fn().mockResolvedValue({ error: null }) })) } })) }));

import {
  approvePayoutBatch,
  cancelPayoutBatch,
  createPayoutBatch,
  markPayoutBatchPaid,
} from "@/domain/partner-sales/payouts";
import { payoutStatementCsv } from "@/domain/partner-sales/payout-pdf";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.$queryRaw.mockResolvedValue([]);
  mocks.partnerCommission.findMany.mockResolvedValue([commission()]);
  mocks.partnerCommission.findUnique.mockResolvedValue(commission());
  mocks.partnerCommission.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...commission(), ...data }));
  mocks.partnerCommissionEntry.create.mockImplementation(async ({ data }: { data: unknown }) => data);
  mocks.partnerPayoutItem.findFirst.mockResolvedValue(null);
  mocks.partnerPayoutItem.findMany.mockResolvedValue([{ id: "item-1", commissionId: ids.commission, amount: new Decimal("125.5000"), status: "ACTIVE" }]);
  mocks.partnerPayoutItem.create.mockImplementation(async ({ data }: { data: unknown }) => data);
  mocks.partnerPayoutBatch.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: ids.batch, ...data }));
  mocks.partnerPayoutBatch.findUnique.mockResolvedValue({ id: ids.batch, status: "PENDING_APPROVAL", preparedById: "preparer", partnershipId: ids.partnership, total: new Decimal("125.5000"), items: [{ id: "item-1", commissionId: ids.commission, amount: new Decimal("125.5000"), status: "ACTIVE" }] });
  mocks.partnerPayoutBatch.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: ids.batch, status: "PENDING_APPROVAL", preparedById: "preparer", partnershipId: ids.partnership, total: new Decimal("125.5000"), ...data }));
  mocks.uploadedDocument.findUnique.mockResolvedValue({ id: "proof-1", mimeType: "application/pdf" });
  mocks.uploadedDocument.create.mockResolvedValue({ id: "statement-1" });
});

describe("partner payout batches", () => {
  it("includes only payable commissions and appends batch entries", async () => {
    const result = await createPayoutBatch({
      partnershipId: ids.partnership,
      commissionIds: [ids.commission],
      periodStart: new Date("2026-09-01"),
      periodEnd: new Date("2026-09-30"),
      preparedById: "preparer",
    });

    expect(result.total).toBe("125.5000");
    expect(mocks.partnerCommission.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "PAYABLE", partnershipId: ids.partnership }) }));
    expect(mocks.partnerCommissionEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: "BATCHED", amount: new Decimal("0.0000") }) }));
    expect(mocks.partnerCommission.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "INCLUDED_IN_BATCH" }) }));
  });

  it("rejects duplicate membership and mixed partnerships", async () => {
    mocks.partnerPayoutItem.findFirst.mockResolvedValue({ id: "existing" });
    await expect(createPayoutBatch({ partnershipId: ids.partnership, commissionIds: [ids.commission], periodStart: new Date(), periodEnd: new Date(), preparedById: "preparer" })).rejects.toThrow(/already belongs/i);

    mocks.partnerPayoutItem.findFirst.mockResolvedValue(null);
    mocks.partnerCommission.findMany.mockResolvedValue([commission(), commission({ id: ids.secondCommission, partnershipId: ids.otherPartnership })]);
    await expect(createPayoutBatch({ partnershipId: ids.partnership, commissionIds: [ids.commission, ids.secondCommission], periodStart: new Date(), periodEnd: new Date(), preparedById: "preparer" })).rejects.toThrow(/same partnership/i);
  });

  it("enforces maker-checker approval and requires EFT evidence", async () => {
    await expect(approvePayoutBatch(ids.batch, "preparer")).rejects.toThrow(/different|separate|same/i);
    mocks.partnerPayoutBatch.findUnique.mockResolvedValue({ id: ids.batch, status: "APPROVED", preparedById: "preparer", partnershipId: ids.partnership, total: new Decimal("125.5000"), items: [{ id: "item-1", commissionId: ids.commission, amount: new Decimal("125.5000"), status: "ACTIVE" }] });
    mocks.partnerCommission.findUnique.mockResolvedValue({ ...commission(), status: "INCLUDED_IN_BATCH" });
    await expect(markPayoutBatchPaid(ids.batch, { paymentReference: " EFT-1 ", paymentDate: new Date(), paidById: "approver" })).rejects.toThrow(/proof/i);

    const approved = await approvePayoutBatch(ids.batch, "approver");
    expect(approved.status).toBe("APPROVED");
    const paid = await markPayoutBatchPaid(ids.batch, { paymentReference: " EFT-1 ", paymentDate: new Date(), proofDocumentId: "proof-1", paidById: "approver" });
    expect(paid.status).toBe("PAID");
    expect(mocks.partnerCommissionEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: "PAYMENT" }) }));
  });

  it("posts payment idempotently and cancellation releases membership", async () => {
    mocks.partnerPayoutBatch.findUnique.mockResolvedValueOnce({ id: ids.batch, status: "PAID", preparedById: "preparer", partnershipId: ids.partnership, total: new Decimal("125.5000"), paymentReference: "EFT-1", items: [{ id: "item-1", commissionId: ids.commission, amount: new Decimal("125.5000"), status: "ACTIVE" }] });
    const first = await markPayoutBatchPaid(ids.batch, { paymentReference: "EFT-1", paymentDate: new Date("2026-09-24"), proofDocumentId: "proof-1", paidById: "approver" });
    expect(first.status).toBe("PAID");
    expect(mocks.partnerCommissionEntry.create).not.toHaveBeenCalled();

    mocks.partnerPayoutBatch.findUnique.mockResolvedValue({ id: ids.batch, status: "PENDING_APPROVAL", preparedById: "preparer", partnershipId: ids.partnership, total: new Decimal("125.5000"), items: [{ id: "item-1", commissionId: ids.commission, amount: new Decimal("125.5000"), status: "ACTIVE" }] });
    mocks.partnerCommission.findUnique.mockResolvedValue({ ...commission(), status: "INCLUDED_IN_BATCH" });
    const cancelled = await cancelPayoutBatch(ids.batch, "preparer", "Correction before EFT");
    expect(cancelled.status).toBe("CANCELLED");
    expect(mocks.partnerCommissionEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: "RELEASE" }) }));
  });

  it("returns the committed batch after a concurrent idempotency unique conflict", async () => {
    const input = { partnershipId: ids.partnership, commissionIds: [ids.commission], periodStart: new Date("2026-09-01"), periodEnd: new Date("2026-09-30"), preparedById: "preparer", idempotencyKey: "payout-key" };
    mocks.partnerPayoutBatch.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: ids.batch, status: "PENDING_APPROVAL", partnershipId: ids.partnership, total: new Decimal("125.5000"), items: [{ commissionId: ids.commission, status: "ACTIVE" }] });
    mocks.partnerPayoutBatch.create.mockRejectedValueOnce({ code: "P2002", meta: { target: ["idempotencyKey"] } });

    await expect(createPayoutBatch(input)).resolves.toMatchObject({ id: ids.batch, total: "125.5000" });
  });

  it("stores a statement with the batch identity, real period, currency, and case/order references", async () => {
    mocks.partnerPayoutBatch.findUnique.mockResolvedValue({
      id: ids.batch,
      status: "APPROVED",
      preparedById: "preparer",
      partnershipId: ids.partnership,
      periodStart: new Date("2026-09-01"),
      periodEnd: new Date("2026-09-30"),
      currency: "USD",
      total: new Decimal("125.5000"),
      partnership: { salesProfile: { displayName: "Acme Partners" } },
      items: [{ id: "item-1", commissionId: ids.commission, amount: new Decimal("125.5000"), status: "ACTIVE", commission: { quoteCase: { caseNumber: "CASE-1" }, order: { orderNumber: "ORD-1" } } }],
    });
    mocks.partnerCommission.findUnique.mockResolvedValue({ ...commission(), status: "INCLUDED_IN_BATCH" });

    await markPayoutBatchPaid(ids.batch, { paymentReference: "EFT-1", paymentDate: new Date("2026-09-30"), proofDocumentId: "proof-1", paidById: "approver" });

    const update = mocks.partnerPayoutBatch.update.mock.calls.at(-1)?.[0];
    expect(update.data.statementDocumentId).toBe("statement-1");
    expect(update.data.statementPayload.csv).toContain("Acme Partners");
    expect(update.data.statementPayload.csv).toContain("CASE-1");
    expect(update.data.statementPayload.csv).toContain("ORD-1");
    expect(update.data.statementPayload.csv).toContain("USD");
    expect(update.data.statementPayload.csv).toContain("2026-09-01");
  });
});

describe("partner payout statements", () => {
  it("reports immutable totals with formula-safe, partner-redacted CSV", () => {
    const csv = payoutStatementCsv({
      batchNumber: "PB-2026-0001",
      partnerName: "=Acme Partners",
      periodStart: new Date("2026-09-01"),
      periodEnd: new Date("2026-09-30"),
      currency: "ZAR",
      total: "125.5000",
      items: [{ caseNumber: "CASE-1", orderNumber: "ORD-1", amount: "125.5000", status: "PAID" }],
      internalNote: "supplier cost R99; gateway secret",
    });
    expect(csv).toContain("PB-2026-0001");
    expect(csv).toContain("125.5000");
    expect(csv).toContain("'=Acme Partners");
    expect(csv).not.toMatch(/supplier|gateway|cost|secret/i);
  });
});
