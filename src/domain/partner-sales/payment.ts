import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import type { Prisma } from "@/generated/prisma/client";
import type { PaymentProvider } from "@/generated/prisma/enums";
import { paymentAmountError } from "@/domain/payments/limits";
import { orderNumber } from "@/domain/quotations/lifecycle";
import { prisma } from "@/lib/prisma";
import { stagePartnerSalesEvent } from "./communications";
import { localProductAvailability, partnerAvailabilityFingerprint, supplierPromotionEvidence } from "./availability";
import { partnerSalesSettings } from "./settings";

export type PartnerPaymentProvider = "PAYFAST" | "OZOW";

export type PartnerQuotePaymentResult = {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  provider: PartnerPaymentProvider;
  amount: string;
  currency: string;
  duplicate: boolean;
};

export type LinkPaidPartnerOrderInput = {
  paymentId: string;
  orderId: string;
  caseId: string;
  quotationId: string;
  quotationVersionId: string;
  provider: PartnerPaymentProvider;
  paidAt?: Date;
};

export class PartnerQuotePaymentError extends Error {
  readonly code: "REPRICE_REQUIRED" | "PAYMENT_NOT_ELIGIBLE";

  constructor(message: string, code: PartnerQuotePaymentError["code"] = "PAYMENT_NOT_ELIGIBLE") {
    super(message);
    this.name = "PartnerQuotePaymentError";
    this.code = code;
  }
}

type QuoteItem = {
  id: string;
  productId: string | null;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: Decimal.Value;
  costPrice: Decimal.Value | null;
  discountTotal: Decimal.Value;
  vatRate: Decimal.Value;
  vatTotal: Decimal.Value;
  lineTotal: Decimal.Value;
  sourceType: string;
  sourceId: string | null;
  sourceSnapshot: unknown;
  stockSnapshot: number | null;
  variantId?: string | null;
};

type Availability = {
  cost: string;
  available: number;
  fingerprint: string;
};

type QuoteVersionRow = {
  id: string;
  quotationId: string;
  version: number;
  snapshot?: unknown;
  quotation: {
    id: string;
    quotationNumber: string;
    status: string;
    kind: string;
    version: number;
    acceptedVersion: number | null;
    acceptedAmount: Decimal.Value | null;
    currency: string;
    subtotal: Decimal.Value;
    discountTotal: Decimal.Value;
    deliveryTotal: Decimal.Value;
    vatTotal: Decimal.Value;
    grandTotal: Decimal.Value;
    validUntil: Date;
    convertedOrderId: string | null;
    items: QuoteItem[];
    partnerQuoteCase: {
      id: string;
      status: string;
      activeQuotationId: string | null;
      acceptedQuotationId: string | null;
      acceptedQuotationVersionId: string | null;
      partnerClient: {
        companyName: string;
        contactName: string;
        email: string;
        phone: string | null;
        vatNumber: string | null;
        deliveryAddress: unknown;
      };
    } | null;
  };
};

type PartnerPaymentDb = Pick<Prisma.TransactionClient, "quotationVersion" | "partnerQuoteCase" | "quotation" | "order" | "payment" | "product" | "supplierCatalogueProduct" | "partnerCommission" | "partnerCommissionEntry" | "auditLog">;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function decimalValue(value: unknown, fallback: Decimal.Value): Decimal.Value {
  return typeof value === "string" || typeof value === "number" || typeof value === "bigint" ? value : fallback;
}

function expectedFingerprint(item: QuoteItem) {
  const snapshot = record(item.sourceSnapshot);
  const fingerprint = snapshot.availabilityFingerprint;
  return typeof fingerprint === "string" && fingerprint ? fingerprint : null;
}

function immutableQuoteRow(row: QuoteVersionRow): QuoteVersionRow {
  const snapshot = record(row.snapshot);
  const audience = record(snapshot.audience);
  const internal = record(audience.internal);
  const internalItems = Array.isArray(internal.items) ? internal.items : [];
  const totals = record(internal.totals);
  if (!internalItems.length || !Object.keys(totals).length) return row;
  const items = row.quotation.items.map((item, index) => {
    const approved = record(internalItems[index]);
    const sourceSnapshot = { ...record(item.sourceSnapshot), availabilityFingerprint: approved.availabilityFingerprint ?? record(item.sourceSnapshot).availabilityFingerprint };
    return {
      ...item,
      productId: item.productId ?? (approved.sourceType === "PRODUCT" && typeof approved.sourceId === "string" ? approved.sourceId : null),
      productName: typeof approved.title === "string" ? approved.title : item.productName,
      quantity: typeof approved.quantity === "number" ? approved.quantity : item.quantity,
      unitPrice: decimalValue(approved.approvedGrossUnit, item.unitPrice),
      costPrice: approved.cost === undefined ? item.costPrice : decimalValue(approved.cost, item.costPrice ?? 0),
      lineTotal: decimalValue(approved.lineTotal, item.lineTotal),
      vatTotal: decimalValue(approved.vatTotal, item.vatTotal),
      sourceType: typeof approved.sourceType === "string" ? approved.sourceType : item.sourceType,
      sourceId: typeof approved.sourceId === "string" ? approved.sourceId : item.sourceId,
      sourceSnapshot,
      stockSnapshot: typeof approved.available === "number" ? approved.available : item.stockSnapshot,
    };
  });
  return {
    ...row,
    quotation: {
      ...row.quotation,
      subtotal: decimalValue(totals.subtotal, row.quotation.subtotal),
      discountTotal: decimalValue(totals.discountTotal, row.quotation.discountTotal),
      deliveryTotal: decimalValue(totals.deliveryTotal, row.quotation.deliveryTotal),
      vatTotal: decimalValue(totals.vatTotal, row.quotation.vatTotal),
      grandTotal: decimalValue(totals.grandTotal, row.quotation.grandTotal),
      items,
    },
  };
}

async function currentAvailability(db: PartnerPaymentDb, item: QuoteItem, now = new Date()): Promise<Availability> {
  if (!item.sourceId) throw new PartnerQuotePaymentError(`${item.productName} has no availability source.`, "REPRICE_REQUIRED");
  if (item.sourceType === "SUPPLIER" || item.sourceType === "SUPPLIER_CATALOGUE_PRODUCT") {
    const source = await db.supplierCatalogueProduct.findUnique({ where: { id: item.sourceId }, select: { costPrice: true, promotionalPrice: true, promotionStartsAt: true, promotionEndsAt: true, stock: true, availability: true } });
    if (!source || source.stock < item.quantity || source.availability !== "IN_STOCK") throw new PartnerQuotePaymentError(`${item.productName} is no longer available; request repricing.`, "REPRICE_REQUIRED");
    const promotion = supplierPromotionEvidence({ costPrice: source.costPrice, promotionalPrice: source.promotionalPrice, promotionStartsAt: source.promotionStartsAt, promotionEndsAt: source.promotionEndsAt, now });
    if (!promotion.effectiveCost) throw new PartnerQuotePaymentError(`${item.productName} has no current cost; request repricing.`, "REPRICE_REQUIRED");
    return { cost: promotion.effectiveCost, available: source.stock, fingerprint: partnerAvailabilityFingerprint({ sourceType: "SUPPLIER_CATALOGUE_PRODUCT", sourceId: item.sourceId, baseCost: promotion.baseCost!, effectiveCost: promotion.effectiveCost, promotionalCost: promotion.promotionalCost, promotionActive: promotion.promotionActive, promotionStartsAt: promotion.promotionStartsAt, promotionEndsAt: promotion.promotionEndsAt, available: source.stock, state: source.availability }) };
  }

  if (!item.productId) throw new PartnerQuotePaymentError(`${item.productName} is not linked to inventory; request repricing.`, "REPRICE_REQUIRED");
  const source = await db.product.findUnique({ where: { id: item.productId }, select: { costPrice: true, stockStatus: true, inventory: { select: { id: true, onHand: true, reserved: true } }, variants: { select: { id: true, isActive: true, costPrice: true, inventory: { select: { onHand: true, reserved: true } } } }, suppliers: { where: { isPreferred: true }, take: 1, select: { costPrice: true } } } });
  if (!source) throw new PartnerQuotePaymentError(`${item.productName} is no longer available; request repricing.`, "REPRICE_REQUIRED");
  const current = localProductAvailability(source);
  if (!current.cost || current.available < item.quantity) throw new PartnerQuotePaymentError(`${item.productName} is no longer sufficiently available; request repricing.`, "REPRICE_REQUIRED");
  return { cost: current.cost, available: current.available, fingerprint: partnerAvailabilityFingerprint({ sourceType: "PRODUCT", sourceId: item.productId, baseCost: current.cost, effectiveCost: current.cost, available: current.available, state: String(source.stockStatus), details: { costEvidence: current.costEvidence } }) };
}

function assertQuoteIdentity(row: QuoteVersionRow, acceptedVersionId: string, now: Date, provider: PartnerPaymentProvider) {
  const quote = row.quotation;
  const quoteCase = quote.partnerQuoteCase;
  if (!quoteCase || quoteCase.acceptedQuotationVersionId !== acceptedVersionId || quoteCase.acceptedQuotationId !== quote.id) {
    throw new PartnerQuotePaymentError("Only the accepted quotation version can start payment.");
  }
  if (quote.status !== "ACCEPTED" || quote.kind !== "FINAL" || quote.version !== row.version || quote.acceptedVersion !== row.version) {
    throw new PartnerQuotePaymentError("The accepted version no longer matches the quotation.");
  }
  if (!quote.acceptedAmount || !new Decimal(quote.acceptedAmount).equals(new Decimal(quote.grandTotal))) {
    throw new PartnerQuotePaymentError("The accepted amount no longer matches the quotation total.");
  }
  if (quote.currency !== "ZAR") throw new PartnerQuotePaymentError("Partner hosted payment requires ZAR currency.");
  if (quote.validUntil <= now) throw new PartnerQuotePaymentError("This quotation has expired and must be repriced.", "REPRICE_REQUIRED");
  if (!["PAYMENT_PENDING", "ACCEPTED"].includes(quoteCase.status)) {
    throw new PartnerQuotePaymentError("This quotation is no longer awaiting payment.");
  }
  const amountError = paymentAmountError(provider, quote.grandTotal);
  if (amountError) throw new PartnerQuotePaymentError(amountError);
}

async function lockCase(db: PartnerPaymentDb, caseId: string) {
  const client = db as unknown as { $queryRawUnsafe?: (query: string, ...values: unknown[]) => Promise<unknown> };
  if (typeof client.$queryRawUnsafe === "function") await client.$queryRawUnsafe('SELECT id FROM "PartnerQuoteCase" WHERE id = $1 FOR UPDATE', caseId);
}

async function loadAcceptedVersion(db: PartnerPaymentDb, acceptedVersionId: string) {
  const row = await db.quotationVersion.findUnique({ where: { id: acceptedVersionId }, include: { quotation: { include: { items: true, partnerQuoteCase: { include: { partnerClient: true } } } } } });
  if (!row) throw new PartnerQuotePaymentError("The accepted quotation version could not be found.");
  return row as unknown as QuoteVersionRow;
}

async function validateAcceptedVersion(db: PartnerPaymentDb, acceptedVersionId: string, provider: PartnerPaymentProvider, now: Date) {
  const loaded = await loadAcceptedVersion(db, acceptedVersionId);
  const row = immutableQuoteRow(loaded);
  const loadedSnapshot = record(loaded.snapshot);
  const loadedAudience = record(loadedSnapshot.audience);
  const originalTotals = record(record(loadedAudience.internal).totals);
  if (Object.keys(originalTotals).length && originalTotals.grandTotal !== undefined && !new Decimal(originalTotals.grandTotal as Decimal.Value).equals(new Decimal(loaded.quotation.grandTotal))) {
    throw new PartnerQuotePaymentError("The approved quotation version no longer matches its immutable snapshot; request repricing.", "REPRICE_REQUIRED");
  }
  assertQuoteIdentity(row, acceptedVersionId, now, provider);
  for (const item of row.quotation.items) {
    const live = await currentAvailability(db, item, now);
    const expected = expectedFingerprint(item);
    if (expected && expected !== live.fingerprint) {
      throw new PartnerQuotePaymentError(`${item.productName} cost or stock changed; request repricing.`, "REPRICE_REQUIRED");
    }
  }
  return row;
}

function orderItemData(item: QuoteItem) {
  return {
    productId: item.productId,
    variantId: item.variantId ?? null,
    productName: item.productName,
    sku: item.sku ?? "QUOTE",
    quantity: item.quantity,
    unitPrice: String(item.unitPrice),
    costPrice: item.costPrice === null ? null : String(item.costPrice),
    discountTotal: String(item.discountTotal),
    vatRate: String(item.vatRate),
    vatTotal: String(item.vatTotal),
    lineTotal: String(item.lineTotal),
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    sourceSnapshot: item.sourceSnapshot ?? undefined,
    stockSnapshot: item.stockSnapshot,
  };
}

function paymentResult(payment: { id: string; orderId: string; provider: PaymentProvider; amount: Decimal.Value; currency: string }, order: { id: string; orderNumber: string }, duplicate: boolean): PartnerQuotePaymentResult {
  return { paymentId: payment.id, orderId: order.id, orderNumber: order.orderNumber, provider: payment.provider as PartnerPaymentProvider, amount: new Decimal(payment.amount).toFixed(2), currency: payment.currency, duplicate };
}

/**
 * Creates the one pending order/payment pair for an accepted partner version.
 * The case lock and deterministic idempotency key make retries from either
 * gateway or browser converge on the same pair.
 */
export async function createPartnerQuotePayment(acceptedVersionId: string, provider: PartnerPaymentProvider, now = new Date()): Promise<PartnerQuotePaymentResult> {
  if (!(await partnerSalesSettings()).enabled) throw new PartnerQuotePaymentError("Partner sales channel is currently unavailable.");
  if (provider !== "PAYFAST" && provider !== "OZOW") throw new PartnerQuotePaymentError("Choose PayFast or Ozow for partner quotation payment.");
  const result = await prisma.$transaction(async (tx) => {
    const db = tx as unknown as PartnerPaymentDb;
    const first = await loadAcceptedVersion(db, acceptedVersionId);
    if (!first.quotation.partnerQuoteCase) throw new PartnerQuotePaymentError("This quotation is not a partner quotation.");
    await lockCase(db, first.quotation.partnerQuoteCase.id);
    const row = await validateAcceptedVersion(db, acceptedVersionId, provider, now);
    const quote = row.quotation;
    const quoteCase = quote.partnerQuoteCase!;
    const idempotencyKey = `partner-quote:${acceptedVersionId}:${provider}`;

    const existingPayment = await db.payment.findUnique({ where: { idempotencyKey }, include: { order: { select: { id: true, orderNumber: true } } } });
    if (existingPayment) {
      if (!new Decimal(existingPayment.amount).equals(new Decimal(quote.grandTotal)) || existingPayment.currency !== quote.currency) throw new PartnerQuotePaymentError("Existing partner payment does not match the accepted amount.");
      return paymentResult(existingPayment, existingPayment.order, true);
    }

    let order = quote.convertedOrderId ? await db.order.findUnique({ where: { id: quote.convertedOrderId }, select: { id: true, orderNumber: true } }) : null;
    order ??= await db.order.findFirst({ where: { partnerQuoteCaseId: quoteCase.id }, select: { id: true, orderNumber: true } });
    if (order) {
      const payment = await db.payment.findFirst({ where: { orderId: order.id, partnerQuoteCaseId: quoteCase.id, provider, idempotencyKey } });
      if (payment) return paymentResult(payment, order, true);
      throw new PartnerQuotePaymentError("This quotation already has an order but no matching payment. Finance review is required.");
    }

    const createdOrder = await db.order.create({ data: {
      orderNumber: orderNumber(),
      userId: null,
      partnerQuoteCaseId: quoteCase.id,
      origin: "PARTNER_SALES",
      email: quoteCase.partnerClient.email,
      phone: quoteCase.partnerClient.phone,
      companyName: quoteCase.partnerClient.companyName,
      vatNumber: quoteCase.partnerClient.vatNumber,
      currency: quote.currency,
      subtotal: String(quote.subtotal),
      discountTotal: String(quote.discountTotal),
      deliveryTotal: String(quote.deliveryTotal),
      vatTotal: String(quote.vatTotal),
      grandTotal: String(quote.grandTotal),
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      paymentMethod: provider,
      customerNotes: null,
      items: { create: quote.items.map(orderItemData) },
    } });
    const paymentId = randomUUID();
    const payment = await db.payment.create({ data: {
      id: paymentId,
      orderId: createdOrder.id,
      partnerQuoteCaseId: quoteCase.id,
      provider,
      status: "PENDING",
      amount: String(quote.grandTotal),
      currency: quote.currency,
      externalReference: paymentId,
      idempotencyKey,
    } });
    await db.quotation.update({ where: { id: quote.id }, data: { convertedOrderId: createdOrder.id } });
    await db.auditLog.create({ data: { action: "partner-sales.payment.create", entityType: "Payment", entityId: payment.id, after: { caseId: quoteCase.id, quotationId: quote.id, quotationVersionId: acceptedVersionId, provider, amount: new Decimal(quote.grandTotal).toFixed(2), orderId: createdOrder.id } } });
    return paymentResult(payment, createdOrder, false);
  }, { isolationLevel: "Serializable" });
  return result;
}

/** Re-checks the accepted version immediately before hosted fields are rendered. */
export async function validatePartnerQuotePayment(paymentId: string, now = new Date()) {
  if (!(await partnerSalesSettings()).enabled) throw new PartnerQuotePaymentError("Partner sales channel is currently unavailable.");
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { partnerQuoteCase: { select: { id: true, acceptedQuotationVersionId: true } } } });
  if (!payment || !payment.partnerQuoteCase?.acceptedQuotationVersionId || payment.provider === "EFT" || payment.provider === "MANUAL") throw new PartnerQuotePaymentError("Partner hosted payment was not found.");
  if (payment.status !== "PENDING") throw new PartnerQuotePaymentError("This payment is no longer pending.");
  await prisma.$transaction(async (tx) => {
    const db = tx as unknown as PartnerPaymentDb;
    await lockCase(db, payment.partnerQuoteCase!.id);
    const row = await validateAcceptedVersion(db, payment.partnerQuoteCase!.acceptedQuotationVersionId!, payment.provider as PartnerPaymentProvider, now);
    if (payment.currency !== row.quotation.currency || !new Decimal(payment.amount).equals(new Decimal(row.quotation.grandTotal))) {
      throw new PartnerQuotePaymentError("The payment amount or currency no longer matches the accepted quotation.");
    }
  });
  return payment;
}

/**
 * Links a verified payment to the already-created partner order. This is kept
 * inside the authoritative finalizer transaction and deliberately performs no
 * external work, so evidence can be retried when operations fail.
 */
export async function linkPaidPartnerOrder(tx: Prisma.TransactionClient, input: LinkPaidPartnerOrderInput) {
  const db = tx as unknown as PartnerPaymentDb;
  await lockCase(db, input.caseId);
  const quoteCase = await tx.partnerQuoteCase.findUnique({ where: { id: input.caseId }, select: { id: true, status: true, acceptedQuotationId: true, acceptedQuotationVersionId: true } });
  if (!quoteCase) throw new PartnerQuotePaymentError("Partner quote case not found.");
  if (quoteCase.acceptedQuotationId !== input.quotationId || quoteCase.acceptedQuotationVersionId !== input.quotationVersionId) throw new PartnerQuotePaymentError("Paid payment does not match the accepted quotation version.");

  const commission = await tx.partnerCommission.findUnique({ where: { caseId: input.caseId } });
  if (!commission) throw new PartnerQuotePaymentError("Partner commission is missing for the accepted quotation.");
  const alreadyLinked = commission.orderId === input.orderId && ["LOCKED_ON_PAYMENT", "PENDING_COMPLETION", "PAYABLE", "HELD", "ADJUSTED", "REVERSED", "INCLUDED_IN_BATCH", "PAID"].includes(commission.status);
  if (alreadyLinked && ["PAID", "ORDER_IN_PROGRESS", "COMPLETED"].includes(quoteCase.status)) return { orderId: input.orderId, caseId: input.caseId, commissionId: commission.id };

  await tx.order.update({ where: { id: input.orderId }, data: { partnerQuoteCaseId: input.caseId } });
  if (!["PAID", "ORDER_IN_PROGRESS", "COMPLETED"].includes(quoteCase.status)) {
    await tx.partnerQuoteCase.update({ where: { id: input.caseId }, data: { status: "PAID", paidAt: input.paidAt ?? new Date() } });
  }
  await tx.quotation.update({ where: { id: input.quotationId }, data: { status: "PAYMENT_VERIFIED", convertedOrderId: input.orderId } });
  if (!alreadyLinked) {
    await tx.partnerCommission.update({ where: { id: commission.id }, data: { orderId: input.orderId, status: "LOCKED_ON_PAYMENT" } });
    const lockEntry = await tx.partnerCommissionEntry.findFirst({ where: { commissionId: commission.id, type: "LOCK" } });
    if (!lockEntry) {
      await tx.partnerCommissionEntry.create({ data: { commissionId: commission.id, type: "LOCK", amount: commission.currentAmount, balanceAfter: commission.currentAmount, reason: "Verified partner quotation payment received", metadata: { paymentId: input.paymentId, quotationVersionId: input.quotationVersionId, provider: input.provider } } });
    }
  }
  await tx.auditLog.create({ data: { action: "partner-sales.payment.link", entityType: "PartnerQuoteCase", entityId: input.caseId, after: { orderId: input.orderId, quotationId: input.quotationId, quotationVersionId: input.quotationVersionId, commissionId: commission.id, provider: input.provider } } });
  await stagePartnerSalesEvent(tx, {
    event: "PAYMENT_CONFIRMED",
    entityId: input.caseId,
    internalMessage: "Verified payment linked to the partner order and commission lock.",
  });
  return { orderId: input.orderId, caseId: input.caseId, commissionId: commission.id };
}
