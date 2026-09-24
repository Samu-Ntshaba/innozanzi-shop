import Decimal from "decimal.js";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { commissionEligibility, type CommissionEligibilityReason } from "./commission";
import { stagePartnerSalesEvent } from "./communications";

type Db = Prisma.TransactionClient;

export type CommissionEvaluation = {
  commissionId: string;
  orderId: string;
  status: string;
  eligible: boolean;
  reasons: CommissionEligibilityReason[];
  amount: string;
};

export type CommissionMutationResult = {
  commissionId: string;
  status: string;
  amount: string;
  balanceAfter: string;
  entryId?: string;
};

export type MutationInput = {
  commissionId: string;
  amount?: Decimal.Value;
  reason: string;
  actorId?: string;
  eventKey?: string;
};

export function returnRequiresCommissionHold(input: {
  status: string;
  resolutionStatus: string;
  refundStatus: string;
  distributorClaimStatus?: string;
}) {
  if (input.status === "REJECTED") return false;
  const financialOutcomeClosed = input.refundStatus === "NOT_REQUIRED" || input.refundStatus === "COMPLETED";
  const distributorOutcomeClosed = !input.distributorClaimStatus || input.distributorClaimStatus === "NOT_REQUIRED" || input.distributorClaimStatus === "CLOSED";
  return !(input.status === "CLOSED" && input.resolutionStatus === "COMPLETED" && financialOutcomeClosed && distributorOutcomeClosed);
}

type CommissionRow = {
  id: string;
  orderId: string | null;
  status: string;
  quotedAmount: Decimal.Value;
  currentAmount: Decimal.Value;
  heldAmount: Decimal.Value;
  adjustedAmount: Decimal.Value;
  reversedAmount: Decimal.Value;
  paidAt?: Date | null;
};

const money = (value: Decimal.Value, label: string) => {
  let result: Decimal;
  try {
    result = new Decimal(value);
  } catch {
    throw new Error(`${label} must be a finite Decimal.`);
  }
  if (!result.isFinite()) throw new Error(`${label} must be a finite Decimal.`);
  return result;
};

const fixed = (value: Decimal.Value) => money(value, "Amount").toFixed(4);

function mutationArgs(
  inputOrId: string | MutationInput,
  amountOrReason: Decimal.Value | string,
  reasonOrActor?: string,
  actorId?: string,
): MutationInput {
  if (typeof inputOrId !== "string") {
    if (!inputOrId.reason.trim()) throw new Error("A reason is required for commission changes.");
    return inputOrId;
  }

  if (typeof amountOrReason === "string" && reasonOrActor === undefined) {
    if (!amountOrReason.trim()) throw new Error("A reason is required for commission changes.");
    return { commissionId: inputOrId, reason: amountOrReason, actorId };
  }

  const reason = reasonOrActor ?? "";
  if (!reason.trim()) throw new Error("A reason is required for commission changes.");
  return { commissionId: inputOrId, amount: amountOrReason, reason, actorId };
}

async function lockCommission(tx: Db, commissionId: string): Promise<CommissionRow> {
  await tx.$queryRaw`SELECT id FROM "PartnerCommission" WHERE id = ${commissionId}::uuid FOR UPDATE`;
  const commission = await tx.partnerCommission.findUnique({ where: { id: commissionId } });
  if (!commission) throw new Error("Partner commission not found.");
  return commission as unknown as CommissionRow;
}

async function existingEntry(tx: Db, commissionId: string, eventKey: string) {
  const entries = await tx.partnerCommissionEntry.findMany({
    where: { commissionId },
    orderBy: { createdAt: "asc" },
  });
  return entries.find((entry) => {
    const metadata = entry.metadata;
    return Boolean(metadata && typeof metadata === "object" && !Array.isArray(metadata) && "eventKey" in metadata && metadata.eventKey === eventKey);
  });
}

async function appendEntry(
  tx: Db,
  commission: CommissionRow,
  input: { type: "HOLD" | "RELEASE" | "ADJUSTMENT" | "REVERSAL" | "CORRECTION"; amount: Decimal; balanceAfter: Decimal; reason: string; actorId?: string; eventKey: string; metadata?: Record<string, unknown> },
) {
  const previous = await existingEntry(tx, commission.id, input.eventKey);
  if (previous) return previous;
  return tx.partnerCommissionEntry.create({
    data: {
      commissionId: commission.id,
      type: input.type,
      amount: input.amount,
      balanceAfter: input.balanceAfter,
      reason: input.reason,
      actorId: input.actorId ?? null,
      metadata: { ...(input.metadata ?? {}), eventKey: input.eventKey },
    },
  });
}

async function auditMutation(tx: Db, actorId: string | undefined, commission: CommissionRow, entry: { type: string; amount: Decimal; balanceAfter: Decimal; reason: string; status: string }) {
  await tx.auditLog.create({
    data: {
      actorId: actorId ?? null,
      action: `partner-sales.commission.${entry.type.toLowerCase()}`,
      entityType: "PartnerCommission",
      entityId: commission.id,
      before: { status: commission.status, currentAmount: fixed(commission.currentAmount) },
      after: { status: entry.status, currentAmount: entry.balanceAfter.toFixed(4), amount: entry.amount.toFixed(4), reason: entry.reason },
    },
  });
}

async function evaluateInTransaction(tx: Db, orderId: string, actorId?: string): Promise<CommissionEvaluation> {
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId}::uuid FOR UPDATE`;
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      payments: { select: { status: true, providerMetadata: true } },
      partnerQuoteCase: { select: { status: true } },
      items: { select: { returnCases: { select: { status: true, resolutionStatus: true, refundStatus: true, distributorClaimStatus: true } } } },
    },
  });
  if (!order) throw new Error("Order not found.");
  const commission = await tx.partnerCommission.findUnique({ where: { orderId } });
  if (!commission) throw new Error("No partner commission is linked to this order.");

  const reconciliation = await tx.auditLog.findFirst({
    where: { action: "order.economics.reconcile", entityType: "Order", entityId: orderId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, after: true },
  });
  const payments = order.payments ?? [];
  const orderItems = order.items ?? [];
  const refunds = payments.some((payment) => payment.status === "REFUNDED" || payment.status === "PARTIALLY_REFUNDED");
  const chargeback = payments.some((payment) => {
    const metadata = payment.providerMetadata;
    return Boolean(metadata && typeof metadata === "object" && !Array.isArray(metadata) && (metadata as Record<string, unknown>).chargeback === true);
  });
  const returnHold = orderItems.some((item) => (item.returnCases ?? []).some((itemReturn) => returnRequiresCommissionHold(itemReturn)));
  const eligibility = commissionEligibility({
    orderCompleted: order.paymentStatus === "PAID" && ["DELIVERED", "COMPLETED"].includes(order.status),
    financiallyReconciled: Boolean(reconciliation),
    refundAmount: refunds ? "1" : "0",
    hasCancellation: order.status === "CANCELLED",
    hasChargeback: chargeback,
    hasDispute: order.partnerQuoteCase?.status === "DISPUTED",
    hasReturnHold: returnHold,
    hasUnresolvedHold: ["HELD"].includes(commission.status),
  });

  let status = commission.status;
  if (commission.status === "LOCKED_ON_PAYMENT") {
    status = "PENDING_COMPLETION";
    await tx.partnerCommission.update({ where: { id: commission.id }, data: { status } });
  }
  const exceptionReasons = eligibility.reasons.filter((reason) => !["ORDER_NOT_COMPLETED", "FINANCIAL_RECONCILIATION_PENDING", "COMMISSION_HOLD"].includes(reason));
  if (!eligibility.eligible && exceptionReasons.length > 0 && !["PAID", "INCLUDED_IN_BATCH", "REVERSED"].includes(commission.status)) {
    status = "HELD";
    await tx.partnerCommission.update({ where: { id: commission.id }, data: { status: "HELD", heldAt: new Date(), adjustmentReason: exceptionReasons.join(", ") } });
    await tx.auditLog.create({ data: { actorId: actorId ?? null, action: "partner-sales.commission.eligibility-hold", entityType: "PartnerCommission", entityId: commission.id, before: { status: commission.status }, after: { status, reasons: exceptionReasons } } });
    await stagePartnerSalesEvent(tx, { event: "COMMISSION_HELD", entityId: commission.id, internalMessage: exceptionReasons.join(", ") });
  } else if (eligibility.eligible && !["PAID", "INCLUDED_IN_BATCH", "REVERSED"].includes(commission.status)) {
    status = "PAYABLE";
    await tx.partnerCommission.update({
      where: { id: commission.id },
      data: { status: "PAYABLE", eligibilityAt: new Date(), reconciledAt: reconciliation?.createdAt ?? new Date(), payableAt: new Date() },
    });
    await tx.auditLog.create({ data: { actorId: actorId ?? null, action: "partner-sales.commission.eligible", entityType: "PartnerCommission", entityId: commission.id, before: { status: commission.status }, after: { status, reconciledAt: reconciliation?.createdAt ?? null } } });
    await stagePartnerSalesEvent(tx, { event: "COMMISSION_PAYABLE", entityId: commission.id, internalMessage: "Completed order and financial reconciliation made the commission payable." });
  }
  return {
    commissionId: commission.id,
    orderId,
    status,
    eligible: eligibility.eligible,
    reasons: eligibility.reasons,
    amount: fixed(commission.currentAmount),
  };
}

export async function evaluateCommission(orderId: string, actorId?: string) {
  return prisma.$transaction((tx) => evaluateInTransaction(tx, orderId, actorId), { isolationLevel: "Serializable" });
}

export async function evaluateCommissionInTransaction(tx: Db, orderId: string, actorId?: string) {
  return evaluateInTransaction(tx, orderId, actorId);
}

async function mutateCommission(tx: Db, input: MutationInput, type: "HOLD" | "ADJUSTMENT" | "REVERSAL" | "CORRECTION") {
  const commission = await lockCommission(tx, input.commissionId);
  if (!input.reason.trim()) throw new Error("A reason is required for commission changes.");
  const amount = input.amount === undefined ? new Decimal(0) : money(input.amount, "Commission amount");
  if (type === "REVERSAL" && amount.isNegative()) throw new Error("Reversal amount must be positive.");
  if (type === "HOLD" && ["PAID", "INCLUDED_IN_BATCH"].includes(commission.status)) throw new Error("Paid commissions cannot be placed on hold; record a compensating correction.");

  const eventKey = input.eventKey ?? `${type}:${commission.id}:${amount.toFixed(4)}:${input.reason.trim()}`;
  const duplicate = await existingEntry(tx, commission.id, eventKey);
  if (duplicate) {
    return { commissionId: commission.id, status: commission.status, amount: fixed(commission.currentAmount), balanceAfter: fixed(duplicate.balanceAfter), entryId: duplicate.id };
  }
  if (type !== "HOLD" && amount.isZero()) throw new Error("Commission amount cannot be zero.");

  const before = money(commission.currentAmount, "Current commission");
  let signed = new Decimal(0);
  let balance = before;
  let status = commission.status;
  let data: Record<string, unknown> = {};
  if (type === "HOLD") {
    status = "HELD";
    data = { status, heldAmount: before, heldAt: new Date(), adjustmentReason: input.reason };
  } else if (type === "ADJUSTMENT") {
    signed = amount;
    balance = before.plus(signed);
    if (balance.isNegative()) throw new Error("Adjustment cannot make the commission balance negative.");
    status = commission.paidAt ? "PAID" : "ADJUSTED";
    data = { status, currentAmount: balance, adjustedAmount: money(commission.adjustedAmount, "Adjusted commission").plus(amount), adjustmentReason: input.reason };
  } else {
    signed = amount.negated();
    balance = before.plus(signed);
    if (!commission.paidAt && balance.isNegative()) throw new Error("Reversal exceeds the unpaid commission balance.");
    status = commission.paidAt ? "PAID" : "REVERSED";
    data = { status, currentAmount: balance, reversedAmount: money(commission.reversedAmount, "Reversed commission").plus(amount), reversedAt: new Date(), adjustmentReason: input.reason };
  }

  const entry = await appendEntry(tx, commission, { type: commission.paidAt && type === "REVERSAL" ? "CORRECTION" : type, amount: signed, balanceAfter: balance, reason: input.reason, actorId: input.actorId, eventKey });
  await tx.partnerCommission.update({ where: { id: commission.id }, data });
  await auditMutation(tx, input.actorId, commission, { type: commission.paidAt && type === "REVERSAL" ? "CORRECTION" : type, amount: signed, balanceAfter: balance, reason: input.reason, status });
  return { commissionId: commission.id, status, amount: balance.toFixed(4), balanceAfter: balance.toFixed(4), entryId: entry.id };
}

export async function holdCommissionInTransaction(tx: Db, input: MutationInput) {
  return mutateCommission(tx, input, "HOLD");
}

export async function adjustCommissionInTransaction(tx: Db, input: MutationInput) {
  return mutateCommission(tx, input, "ADJUSTMENT");
}

export async function reverseCommissionInTransaction(tx: Db, input: MutationInput) {
  const commission = input.amount === undefined
    ? await tx.partnerCommission.findUnique({ where: { id: input.commissionId }, select: { currentAmount: true } })
    : null;
  return mutateCommission(tx, commission ? { ...input, amount: commission.currentAmount } : input, "REVERSAL");
}

/**
 * Authoritative financial-event hook used by gateway refunds and the EFT
 * return workflow. The event key makes retries append no duplicate ledger
 * entry; paid commissions receive a CORRECTION entry through the normal
 * reversal path instead of mutating paid history.
 */
export async function reconcilePartnerCommissionAfterRefundInTransaction(
  tx: Db,
  input: { orderId: string; refundAmount: Decimal.Value; capturedAmount: Decimal.Value; reason: string; actorId?: string; eventKey: string },
) {
  const commission = await tx.partnerCommission.findUnique({ where: { orderId: input.orderId } });
  if (!commission) return null;
  const refund = money(input.refundAmount, "Refund amount");
  const captured = money(input.capturedAmount, "Captured amount");
  if (refund.isNegative() || captured.isNegative() || captured.isZero() || refund.gt(captured)) throw new Error("Refund amount is outside the captured payment.");
  const entries = await tx.partnerCommissionEntry.findMany({ where: { commissionId: commission.id }, select: { type: true, amount: true } });
  const alreadyReversed = entries
    .filter((entry) => entry.type === "REVERSAL" || entry.type === "CORRECTION")
    .reduce((sum, entry) => sum.plus(new Decimal(entry.amount).abs()), new Decimal(0));
  // Gateway and return workflows pass the cumulative authoritative refund
  // amount. Only the delta from the append-only ledger may be reversed.
  const amount = Decimal.min(
    money(commission.currentAmount, "Commission amount"),
    Decimal.max(new Decimal(0), money(commission.quotedAmount, "Quoted commission").mul(refund).div(captured).minus(alreadyReversed)),
  ).toDecimalPlaces(4);
  if (amount.isZero()) return { commissionId: commission.id, amount: "0.0000", status: commission.status };
  return reverseCommissionInTransaction(tx, { commissionId: commission.id, amount, reason: input.reason, actorId: input.actorId, eventKey: input.eventKey });
}

export async function reconcilePartnerCommissionAfterRefund(input: { orderId: string; refundAmount: Decimal.Value; capturedAmount: Decimal.Value; reason: string; actorId?: string; eventKey: string }) {
  return prisma.$transaction((tx) => reconcilePartnerCommissionAfterRefundInTransaction(tx, input), { isolationLevel: "Serializable" });
}

export async function holdCommission(input: MutationInput): Promise<CommissionMutationResult>;
export async function holdCommission(commissionId: string, reason: string, actorId?: string): Promise<CommissionMutationResult>;
export async function holdCommission(inputOrId: string | MutationInput, reason?: string, actorId?: string) {
  const input = typeof inputOrId === "string" ? mutationArgs(inputOrId, reason ?? "", undefined, actorId) : inputOrId;
  return prisma.$transaction((tx) => holdCommissionInTransaction(tx, input), { isolationLevel: "Serializable" });
}

export async function adjustCommission(input: MutationInput): Promise<CommissionMutationResult>;
export async function adjustCommission(commissionId: string, amount: Decimal.Value, reason: string, actorId?: string): Promise<CommissionMutationResult>;
export async function adjustCommission(inputOrId: string | MutationInput, amountOrReason?: Decimal.Value | string, reasonOrActor?: string, actorId?: string) {
  const input = typeof inputOrId === "string" ? mutationArgs(inputOrId, amountOrReason ?? "", reasonOrActor, actorId) : inputOrId;
  return prisma.$transaction((tx) => adjustCommissionInTransaction(tx, input), { isolationLevel: "Serializable" });
}

export async function reverseCommission(input: MutationInput): Promise<CommissionMutationResult>;
export async function reverseCommission(commissionId: string, amount: Decimal.Value, reason: string, actorId?: string): Promise<CommissionMutationResult>;
export async function reverseCommission(commissionId: string, reason: string, actorId?: string): Promise<CommissionMutationResult>;
export async function reverseCommission(inputOrId: string | MutationInput, amountOrReason?: Decimal.Value | string, reasonOrActor?: string, actorId?: string) {
  let input: MutationInput;
  if (typeof inputOrId !== "string") input = inputOrId;
  else if (reasonOrActor !== undefined && actorId === undefined && typeof amountOrReason === "string" && !/^[-+]?\d+(?:\.\d+)?$/.test(amountOrReason.trim())) input = { commissionId: inputOrId, reason: amountOrReason, actorId: reasonOrActor };
  else input = mutationArgs(inputOrId, amountOrReason ?? "", reasonOrActor, actorId);
  return prisma.$transaction((tx) => reverseCommissionInTransaction(tx, input), { isolationLevel: "Serializable" });
}
