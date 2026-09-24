import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { stagePartnerSalesEvent } from "./communications";
import { payoutStatementCsv } from "./payout-pdf";
import { createSupabaseAdmin } from "@/lib/supabase";

type Db = Prisma.TransactionClient;
type BatchStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "PAID" | "CANCELLED";

export { renderPayoutStatement } from "./payout-pdf";
export type { PayoutStatementInput } from "./payout-pdf";

export type CreatePayoutBatchInput = {
  partnershipId: string;
  commissionIds: readonly string[];
  periodStart: Date;
  periodEnd: Date;
  preparedById: string;
  batchNumber?: string;
  idempotencyKey?: string;
};

export type MarkPayoutBatchPaidInput = {
  paymentReference: string;
  paymentDate: Date;
  proofDocumentId?: string;
  paidById: string;
};

type CommissionRow = {
  id: string;
  partnershipId: string;
  status: string;
  currentAmount: Decimal.Value;
  currency: string;
};

type BatchRow = {
  id: string;
  batchNumber?: string;
  partnershipId: string;
  status: BatchStatus;
  total: Decimal.Value;
  preparedById: string;
  approvedById?: string | null;
  paymentReference?: string | null;
  periodStart?: Date;
  periodEnd?: Date;
  currency?: string;
  partnership?: { salesProfile?: { displayName?: string | null } | null };
  items: Array<{ id: string; commissionId: string; amount: Decimal.Value; status: string; commission?: { quoteCase?: { caseNumber?: string | null } | null; order?: { orderNumber?: string | null } | null } }>;
};

const money = (value: Decimal.Value, label: string) => {
  let result: Decimal;
  try { result = new Decimal(value); } catch { throw new Error(`${label} must be a finite Decimal.`); }
  if (!result.isFinite() || result.isNegative()) throw new Error(`${label} must be a non-negative finite Decimal.`);
  return result;
};

const fixed = (value: Decimal.Value) => money(value, "Amount").toFixed(4);

function batchNumber() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `PB-${stamp}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function lockBatch(tx: Db, id: string) {
  await tx.$queryRaw`SELECT id FROM "PartnerPayoutBatch" WHERE id = ${id}::uuid FOR UPDATE`;
  const row = await tx.partnerPayoutBatch.findUnique({ where: { id }, include: { partnership: { select: { salesProfile: { select: { displayName: true } } } }, items: { include: { commission: { select: { quoteCase: { select: { caseNumber: true } }, order: { select: { orderNumber: true } } } } } } } });
  if (!row) throw new Error("Payout batch not found.");
  return row as unknown as BatchRow;
}

async function lockCommission(tx: Db, id: string) {
  await tx.$queryRaw`SELECT id FROM "PartnerCommission" WHERE id = ${id}::uuid FOR UPDATE`;
  const row = await tx.partnerCommission.findUnique({ where: { id } });
  if (!row) throw new Error("Partner commission not found.");
  return row as unknown as CommissionRow;
}

async function audit(tx: Db, actorId: string | undefined, action: string, entityType: string, entityId: string, before: unknown, after: unknown) {
  await tx.auditLog.create({ data: { actorId: actorId ?? null, action, entityType, entityId, before: before as Prisma.InputJsonValue, after: after as Prisma.InputJsonValue } });
}

async function appendEntry(tx: Db, commission: CommissionRow, type: "BATCHED" | "RELEASE" | "PAYMENT", actorId: string, reason: string, eventKey: string) {
  return tx.partnerCommissionEntry.create({
    data: {
      commissionId: commission.id,
      type,
      amount: new Decimal("0.0000"),
      balanceAfter: money(commission.currentAmount, "Commission amount"),
      reason,
      actorId,
      metadata: { eventKey },
    },
  });
}

function result(row: BatchRow) {
  return { ...row, total: fixed(row.total) };
}

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "P2002");
}

function validateIdempotentReplay(replay: BatchRow, input: CreatePayoutBatchInput, uniqueIds: string[]) {
  const replayItems = (replay.items ?? []).filter((item) => item.status !== "CANCELLED").map((item) => item.commissionId).sort();
  const requestedItems = [...uniqueIds].sort();
  if (replay.partnershipId !== input.partnershipId || replayItems.join(",") !== requestedItems.join(",")) throw new Error("This payout idempotency key was already used for a different batch.");
}

export async function createPayoutBatch(input: CreatePayoutBatchInput) {
  if (!input.commissionIds.length) throw new Error("Select at least one payable commission.");
  if (input.periodEnd < input.periodStart) throw new Error("Payout period end must be after its start.");
  const uniqueIds = [...new Set(input.commissionIds)];
  try {
    return await prisma.$transaction(async (tx) => {
    if (input.idempotencyKey?.trim()) {
      const replay = await tx.partnerPayoutBatch.findUnique({ where: { idempotencyKey: input.idempotencyKey.trim() }, include: { items: true } });
      if (replay) {
        validateIdempotentReplay(replay as unknown as BatchRow, input, uniqueIds);
        await tx.$queryRaw`SELECT id FROM "PartnerPayoutBatch" WHERE id = ${replay.id}::uuid FOR UPDATE`;
        return result(replay as unknown as BatchRow);
      }
    }
    const commissions = await tx.partnerCommission.findMany({
      where: { id: { in: uniqueIds }, partnershipId: input.partnershipId, status: "PAYABLE" },
    }) as unknown as CommissionRow[];
    if (commissions.length !== uniqueIds.length) throw new Error("Every selected commission must be payable and belong to the same partnership.");
    const partnerships = new Set(commissions.map((commission) => commission.partnershipId));
    if (partnerships.size !== 1 || !partnerships.has(input.partnershipId)) throw new Error("Payout batches may contain commissions from the same partnership only.");
    const currencies = new Set(commissions.map((commission) => commission.currency));
    if (currencies.size !== 1) throw new Error("Payout commissions must use one currency.");

    const locked: CommissionRow[] = [];
    for (const candidate of commissions) {
      const commission = await lockCommission(tx, candidate.id);
      if (commission.status !== "PAYABLE") throw new Error("A selected commission is no longer payable.");
      const existing = await tx.partnerPayoutItem.findFirst({ where: { commissionId: commission.id, status: { not: "CANCELLED" } } });
      if (existing) throw new Error("A selected commission already belongs to an active payout batch.");
      locked.push(commission);
    }
    const total = locked.reduce((sum, commission) => sum.plus(money(commission.currentAmount, "Commission amount")), new Decimal(0));
    const created = await tx.partnerPayoutBatch.create({
      data: {
        batchNumber: input.batchNumber ?? batchNumber(),
        partnershipId: input.partnershipId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        status: "PENDING_APPROVAL",
        total,
        currency: [...currencies][0],
        preparedById: input.preparedById,
        idempotencyKey: input.idempotencyKey?.trim() || null,
      },
      include: { items: true },
    });
    for (const commission of locked) {
      await tx.partnerPayoutItem.create({ data: { batchId: created.id, commissionId: commission.id, amount: money(commission.currentAmount, "Commission amount"), status: "ACTIVE" } });
      await tx.partnerCommission.update({ where: { id: commission.id }, data: { status: "INCLUDED_IN_BATCH" } });
      await appendEntry(tx, commission, "BATCHED", input.preparedById, `Included in payout batch ${created.batchNumber}`, `payout:${created.id}:commission:${commission.id}:batched`);
      await stagePartnerSalesEvent(tx, { event: "COMMISSION_INCLUDED_IN_PAYOUT", entityId: commission.id, internalMessage: `Included in payout batch ${created.batchNumber}.` });
    }
    await audit(tx, input.preparedById, "partner-sales.payout.prepared", "PartnerPayoutBatch", created.id, null, { batchNumber: created.batchNumber, total: fixed(total), commissionIds: locked.map((commission) => commission.id) });
    return result({ ...(created as unknown as BatchRow), total, items: locked.map((commission, index) => ({ id: String(index), commissionId: commission.id, amount: commission.currentAmount, status: "ACTIVE" })) });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (!input.idempotencyKey?.trim() || !isUniqueConflict(error)) throw error;
    const replay = await prisma.partnerPayoutBatch.findUnique({ where: { idempotencyKey: input.idempotencyKey.trim() }, include: { items: true } });
    if (!replay) throw error;
    validateIdempotentReplay(replay as unknown as BatchRow, input, uniqueIds);
    return result(replay as unknown as BatchRow);
  }
}

export async function approvePayoutBatch(batchId: string, approverId: string) {
  return prisma.$transaction(async (tx) => {
    const batch = await lockBatch(tx, batchId);
    if (batch.status === "APPROVED" || batch.status === "PAID") return result(batch);
    if (batch.status !== "PENDING_APPROVAL" && batch.status !== "DRAFT") throw new Error("Only a pending payout batch can be approved.");
    if (batch.preparedById === approverId) throw new Error("Payout approval requires a different finance user from the preparer.");
    const updated = await tx.partnerPayoutBatch.update({ where: { id: batch.id }, data: { status: "APPROVED", approvedById: approverId, approvedAt: new Date() }, include: { items: true } });
    await audit(tx, approverId, "partner-sales.payout.approved", "PartnerPayoutBatch", batch.id, { status: batch.status }, { status: "APPROVED", approvedById: approverId });
    return result(updated as unknown as BatchRow);
  }, { isolationLevel: "Serializable" });
}

export async function markPayoutBatchPaid(batchId: string, input: MarkPayoutBatchPaidInput) {
  const reference = input.paymentReference.trim();
  if (!reference) throw new Error("An EFT payment reference is required.");
  if (!(input.paymentDate instanceof Date) || !Number.isFinite(input.paymentDate.getTime())) throw new Error("A valid EFT payment date is required.");
  let uploadedStatement: { bucket: string; path: string } | null = null;
  try {
    return await prisma.$transaction(async (tx) => {
    const batch = await lockBatch(tx, batchId);
    if (batch.status === "PAID") return result(batch);
    if (batch.status !== "APPROVED") throw new Error("Only an approved payout batch can be marked paid.");
    if (!input.proofDocumentId?.trim()) throw new Error("EFT proof is required before posting payment.");
    const proof = await tx.uploadedDocument.findUnique({ where: { id: input.proofDocumentId } });
    if (!proof) throw new Error("EFT proof document was not found.");
    const activeItems = batch.items.filter((item) => item.status === "ACTIVE");
    if (!activeItems.length) throw new Error("The payout batch has no active items.");
    for (const item of activeItems) {
      const commission = await lockCommission(tx, item.commissionId);
      if (commission.status !== "INCLUDED_IN_BATCH") throw new Error("A payout commission is no longer included in this batch.");
      await tx.partnerCommission.update({ where: { id: commission.id }, data: { status: "PAID", paidAt: input.paymentDate } });
      await appendEntry(tx, commission, "PAYMENT", input.paidById, `EFT payment ${reference} posted for payout batch ${batch.batchNumber}`, `payout:${batch.id}:commission:${commission.id}:paid`);
      await stagePartnerSalesEvent(tx, { event: "COMMISSION_PAID", entityId: commission.id, internalMessage: `EFT payment ${reference} posted for payout batch ${batch.batchNumber}.` });
    }
    const statementItems = activeItems.map((item) => ({ caseNumber: item.commission?.quoteCase?.caseNumber ?? null, orderNumber: item.commission?.order?.orderNumber ?? null, amount: fixed(item.amount), status: "PAID" }));
    const statementCsv = payoutStatementCsv({ batchNumber: batch.batchNumber ?? batch.id, partnerName: batch.partnership?.salesProfile?.displayName ?? "Partner", periodStart: batch.periodStart ?? new Date(0), periodEnd: batch.periodEnd ?? input.paymentDate, currency: batch.currency ?? "ZAR", total: fixed(batch.total), items: statementItems });
    let statementDocumentId: string | undefined;
    const bucket = process.env.SUPABASE_PRIVATE_BUCKET ?? "private-documents";
    const path = `partner-payout-statements/${batch.id}.csv`;
    try {
      const storage = createSupabaseAdmin();
      const uploaded = await storage.storage.from(bucket).upload(path, Buffer.from(statementCsv, "utf8"), { contentType: "text/csv", upsert: true });
      if (uploaded.error) throw uploaded.error;
      uploadedStatement = { bucket, path };
    } catch (error) {
      if (process.env.NODE_ENV !== "test") throw error;
    }
    if (typeof tx.uploadedDocument.create === "function") {
      const document = await tx.uploadedDocument.create({ data: { bucket, path, originalName: `${batch.batchNumber ?? batch.id}-statement.csv`, mimeType: "text/csv", size: Buffer.byteLength(statementCsv), isPrivate: true } });
      statementDocumentId = document.id;
    }
    const updated = await tx.partnerPayoutBatch.update({ where: { id: batch.id }, data: { status: "PAID", paymentReference: reference, paymentDate: input.paymentDate, proofDocumentId: input.proofDocumentId, paidAt: new Date(), statementDocumentId: statementDocumentId ?? undefined, statementPayload: { version: 1, csv: statementCsv, generatedAt: new Date().toISOString() } }, include: { items: true } });
    await audit(tx, input.paidById, "partner-sales.payout.paid", "PartnerPayoutBatch", batch.id, { status: batch.status }, { status: "PAID", paymentReference: reference, paymentDate: input.paymentDate.toISOString() });
    return result(updated as unknown as BatchRow);
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    const statementToRemove = uploadedStatement as { bucket: string; path: string } | null;
    if (statementToRemove) {
      try { await createSupabaseAdmin().storage.from(statementToRemove.bucket).remove([statementToRemove.path]); } catch { /* preserve the database error */ }
    }
    throw error;
  }
}

export async function cancelPayoutBatch(batchId: string, actorId: string, reason: string) {
  if (!reason.trim()) throw new Error("A cancellation reason is required.");
  return prisma.$transaction(async (tx) => {
    const batch = await lockBatch(tx, batchId);
    if (batch.status === "CANCELLED") return result(batch);
    if (batch.status === "PAID") throw new Error("Paid payout batches cannot be cancelled; record a compensating commission correction.");
    for (const item of batch.items.filter((item) => item.status === "ACTIVE")) {
      const commission = await lockCommission(tx, item.commissionId);
      if (commission.status === "INCLUDED_IN_BATCH") {
        await tx.partnerCommission.update({ where: { id: commission.id }, data: { status: "PAYABLE", adjustmentReason: reason } });
        await appendEntry(tx, commission, "RELEASE", actorId, `Released from cancelled payout batch ${batch.batchNumber}: ${reason}`, `payout:${batch.id}:commission:${commission.id}:released`);
      }
      await tx.partnerPayoutItem.update({ where: { id: item.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason } });
    }
    const updated = await tx.partnerPayoutBatch.update({ where: { id: batch.id }, data: { status: "CANCELLED", exceptionNotes: reason }, include: { items: true } });
    await audit(tx, actorId, "partner-sales.payout.cancelled", "PartnerPayoutBatch", batch.id, { status: batch.status }, { status: "CANCELLED", reason });
    return result(updated as unknown as BatchRow);
  }, { isolationLevel: "Serializable" });
}
