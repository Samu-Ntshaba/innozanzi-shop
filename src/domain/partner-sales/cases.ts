import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { hasPermission, type PermissionGrant } from "@/domain/auth/permissions";
import { getCommerceSettings } from "@/domain/commerce/settings";
import type { PartnerCommissionMethod } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  calculatePartnerPricing,
  clientPricingSnapshot,
  internalPricingSnapshot,
  PartnerPricingError,
  type PartnerPricingGateway,
  type PartnerPricingInput,
  type PartnerPricingItem,
} from "./pricing";
import { stagePartnerSalesEvent } from "./communications";
import { localProductAvailability, partnerAvailabilityFingerprint, supplierPromotionEvidence } from "./availability";

export { PartnerPricingError } from "./pricing";

export type PartnerPricingActor = {
  user: { id: string; email?: string | null };
  grants?: readonly PermissionGrant[];
  isSuperAdministrator?: boolean;
};

export type ApprovePartnerQuotationInput = {
  caseId: string;
  items?: Array<{ id: string; unitPrice: string | number }>;
  deliveryTotal?: string | number;
  discountTotal?: string | number;
  gateway?: PartnerPricingGateway;
  validUntil?: Date | string;
  commissionMethod?: PartnerCommissionMethod;
  commissionValue?: string | number;
  commissionOverrideReason?: string;
};

type QuoteCaseRecord = {
  id: string;
  caseNumber: string;
  partnershipId: string;
  profileId: string;
  partnerClientId: string;
  status: string;
  innozanziOwnerId: string | null;
  activeQuotationId?: string | null;
  profile: {
    publicSlug?: string | null;
    displayName?: string | null;
    contactEmail?: string | null;
    defaultCommissionMethod: PartnerCommissionMethod;
    defaultCommissionValue: unknown;
  };
  partnerClient: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string | null;
    vatNumber?: string | null;
    billingAddress?: unknown;
    deliveryAddress?: unknown;
    communicationConsent?: boolean | null;
  };
  quotationRequest?: {
    id: string;
    requestNumber: string;
    contactName: string;
    email: string;
    phone?: string | null;
    companyName?: string | null;
    vatNumber?: string | null;
    deliveryAddress?: unknown;
    requirements?: string | null;
    customerNotes?: string | null;
    items: Array<{
      id: string;
      productName: string | null;
      requestedQuantity: number;
      productSnapshot: unknown;
      productId?: string | null;
      variantId?: string | null;
    }>;
  };
  quotations?: Array<{ version: number }>;
};

type QuoteRequestItem = NonNullable<QuoteCaseRecord["quotationRequest"]>["items"][number];

type PartnerCaseDatabase = Pick<
  Prisma.TransactionClient,
  | "partnerQuoteCase"
  | "quotation"
  | "quotationItem"
  | "quotationVersion"
  | "partnerCommission"
  | "partnerCommissionEntry"
  | "quotationStatusHistory"
  | "auditLog"
  | "quotationRequest"
  | "product"
  | "supplierCatalogueProduct"
>;

const caseInclude = {
  profile: { select: { publicSlug: true, displayName: true, contactEmail: true, defaultCommissionMethod: true, defaultCommissionValue: true } },
  partnerClient: { select: { companyName: true, contactName: true, email: true, phone: true, vatNumber: true, billingAddress: true, deliveryAddress: true } },
  quotationRequest: { include: { items: true } },
  quotations: { select: { version: true }, orderBy: { version: "desc" }, take: 20 },
} as const;

function assertPricingPermission(actor: PartnerPricingActor) {
  if (actor.isSuperAdministrator) return;
  if (!actor.grants || !hasPermission(actor.grants, "partner_sales.pricing.approve")) {
    throw new PartnerPricingError("You do not have permission to approve partner pricing.");
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : typeof value === "string" && Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

async function currentSource(db: PartnerCaseDatabase, item: QuoteRequestItem, snapshot: Record<string, unknown>, now = new Date()) {
  if (snapshot.currentCost !== undefined || snapshot.currentAvailable !== undefined || snapshot.currentAvailabilityFingerprint !== undefined) {
    const previousCost = snapshot.cost === undefined ? undefined : String(snapshot.cost);
    const currentCost = snapshot.currentCost === undefined ? previousCost : String(snapshot.currentCost);
    const previousAvailable = snapshot.available === undefined ? undefined : numberValue(snapshot.available, item.requestedQuantity);
    const currentAvailable = numberValue(snapshot.currentAvailable, previousAvailable ?? item.requestedQuantity);
    const changedWithoutFingerprint = (previousCost !== undefined && currentCost !== previousCost) || (previousAvailable !== undefined && currentAvailable !== previousAvailable);
    return {
      cost: currentCost,
      available: currentAvailable,
      currentAvailabilityFingerprint: typeof snapshot.currentAvailabilityFingerprint === "string" ? snapshot.currentAvailabilityFingerprint : changedWithoutFingerprint ? "changed" : null,
    };
  }
  // Enquiry snapshots normally carry all evidence required for a preview. Only
  // query source records when a legacy request omitted that evidence.
  if (snapshot.cost !== undefined && snapshot.available !== undefined) {
    return { cost: snapshot.cost, available: numberValue(snapshot.available, item.requestedQuantity), currentAvailabilityFingerprint: null };
  }
  const sourceType = stringValue(snapshot.sourceType, "");
  const sourceId = typeof snapshot.sourceId === "string" ? snapshot.sourceId : undefined;
  if (!sourceId) throw new PartnerPricingError(`${item.productName ?? "An item"} has no current cost or stock evidence.`);
  if (sourceType === "PRODUCT") {
    const product = await db.product.findUnique({ where: { id: sourceId }, select: { costPrice: true, stockStatus: true, inventory: { select: { id: true, onHand: true, reserved: true } }, variants: { select: { id: true, isActive: true, costPrice: true, inventory: { select: { onHand: true, reserved: true } } } }, suppliers: { where: { isPreferred: true }, take: 1, select: { costPrice: true } } } });
    if (!product) throw new PartnerPricingError("A quoted product is no longer available.");
    const current = localProductAvailability(product);
    if (!current.cost || current.available <= 0) throw new PartnerPricingError("A quoted product is no longer available.");
    return { cost: current.cost, available: current.available, currentAvailabilityFingerprint: partnerAvailabilityFingerprint({ sourceType, sourceId, baseCost: current.cost, effectiveCost: current.cost, available: current.available, state: String(product.stockStatus), details: { costEvidence: current.costEvidence } }) };
  }
  if (sourceType === "SUPPLIER_CATALOGUE_PRODUCT") {
    const product = await db.supplierCatalogueProduct.findUnique({ where: { id: sourceId }, select: { costPrice: true, promotionalPrice: true, promotionStartsAt: true, promotionEndsAt: true, stock: true, availability: true } });
    if (!product) throw new PartnerPricingError("A supplier item is no longer available.");
    const promotion = supplierPromotionEvidence({ costPrice: product.costPrice, promotionalPrice: product.promotionalPrice, promotionStartsAt: product.promotionStartsAt, promotionEndsAt: product.promotionEndsAt, now });
    if (!promotion.effectiveCost || product.stock <= 0 || product.availability !== "IN_STOCK") throw new PartnerPricingError("A supplier item is no longer available.");
    return { cost: promotion.effectiveCost, available: product.stock, currentAvailabilityFingerprint: partnerAvailabilityFingerprint({ sourceType, sourceId, baseCost: promotion.baseCost!, effectiveCost: promotion.effectiveCost!, promotionalCost: promotion.promotionalCost, promotionActive: promotion.promotionActive, promotionStartsAt: promotion.promotionStartsAt, promotionEndsAt: promotion.promotionEndsAt, available: product.stock, state: product.availability }) };
  }
  throw new PartnerPricingError(`${item.productName ?? "An item"} has no supported current availability source.`);
}

async function loadCase(db: PartnerCaseDatabase, caseId: string) {
  const quoteCase = await db.partnerQuoteCase.findUnique({ where: { id: caseId }, include: caseInclude });
  if (!quoteCase) throw new PartnerPricingError("Partner quote case not found.");
  const typed = quoteCase as unknown as QuoteCaseRecord;
  return typed;
}

async function lockCase(db: unknown, caseId: string) {
  const candidate = db as { $queryRawUnsafe?: (query: string, ...values: unknown[]) => Promise<unknown> };
  if (typeof candidate.$queryRawUnsafe === "function") {
    await candidate.$queryRawUnsafe('SELECT id FROM "PartnerQuoteCase" WHERE id = $1 FOR UPDATE', caseId);
  }
}

async function pricingInputForCase(db: PartnerCaseDatabase, quoteCase: QuoteCaseRecord, overrides: Partial<Omit<ApprovePartnerQuotationInput, "caseId">> = {}, now = new Date()): Promise<PartnerPricingInput> {
  if (!quoteCase.quotationRequest?.items?.length) throw new PartnerPricingError("The partner quote case has no requested items.");
  const sourceItems: PartnerPricingItem[] = [];
  for (const item of quoteCase.quotationRequest!.items) {
    const snapshot = record(item.productSnapshot);
    const current = await currentSource(db, item, snapshot, now);
    const storedFingerprint = typeof snapshot.availabilityFingerprint === "string" ? snapshot.availabilityFingerprint : null;
    sourceItems.push({
      id: item.id,
      sourceType: typeof snapshot.sourceType === "string" ? snapshot.sourceType : undefined,
      sourceId: typeof snapshot.sourceId === "string" ? snapshot.sourceId : item.productId ?? undefined,
      title: item.productName ?? stringValue(snapshot.title, "Requested item"),
      quantity: item.requestedQuantity,
      cost: current.cost === undefined || current.cost === null ? String(snapshot.cost ?? 0) : String(current.cost),
      available: current.available,
      availabilityFingerprint: storedFingerprint,
      currentAvailabilityFingerprint: current.currentAvailabilityFingerprint,
    });
  }
  const approvedUnitPrices = overrides.items?.length
    ? Object.fromEntries(overrides.items.map((item) => [item.id, item.unitPrice]))
    : undefined;
  const settings = await getCommerceSettings();
  return {
    items: sourceItems,
    settings,
    gateway: overrides.gateway ?? "PAYFAST",
    deliveryTotal: overrides.deliveryTotal ?? 0,
    discountTotal: overrides.discountTotal ?? 0,
    defaultCommissionMethod: quoteCase.profile.defaultCommissionMethod,
    defaultCommissionValue: String(quoteCase.profile.defaultCommissionValue),
    commissionMethod: overrides.commissionMethod,
    commissionValue: overrides.commissionValue,
    commissionOverrideReason: overrides.commissionOverrideReason,
    approvedUnitPrices,
    validUntil: overrides.validUntil ? new Date(overrides.validUntil) : undefined,
  };
}

export async function quotePartnerCase(caseId: string, actor: PartnerPricingActor) {
  assertPricingPermission(actor);
  const quoteCase = await loadCase(prisma as unknown as PartnerCaseDatabase, caseId);
  const result = calculatePartnerPricing(await pricingInputForCase(prisma as unknown as PartnerCaseDatabase, quoteCase, {}, new Date()));
  return {
    caseId: quoteCase.id,
    caseNumber: quoteCase.caseNumber,
    status: quoteCase.status,
    pricing: result,
    internalSnapshot: internalPricingSnapshot(result),
    clientSnapshot: clientPricingSnapshot(result, quoteCase.profile),
  };
}

const approvalSchema = z.object({
  caseId: z.string().uuid(),
  items: z.array(z.object({ id: z.string().min(1), unitPrice: z.coerce.number().positive() })).optional(),
  deliveryTotal: z.coerce.number().min(0).optional(),
  discountTotal: z.coerce.number().min(0).optional(),
  gateway: z.enum(["PAYFAST", "OZOW", "EFT"]).optional(),
  validUntil: z.coerce.date().optional(),
  commissionMethod: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).optional(),
  commissionValue: z.coerce.number().min(0).optional(),
  commissionOverrideReason: z.string().trim().max(2000).optional(),
}).strict();

export async function approvePartnerQuotation(rawInput: unknown, actor: PartnerPricingActor) {
  assertPricingPermission(actor);
  const input = approvalSchema.parse(rawInput);
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const db = tx as unknown as PartnerCaseDatabase;
    await lockCase(tx, input.caseId);
    const quoteCase = await loadCase(db, input.caseId);
    if (quoteCase.innozanziOwnerId === actor.user.id && !actor.isSuperAdministrator) {
      throw new PartnerPricingError("The Innozanzi case owner cannot approve their own quotation.");
    }
    if (["COMPLETED", "DECLINED", "EXPIRED", "CANCELLED", "REFUNDED", "DISPUTED"].includes(quoteCase.status)) {
      throw new PartnerPricingError("This quote case cannot receive a new commercial approval.");
    }
    const pricing = calculatePartnerPricing(await pricingInputForCase(db, quoteCase, input, now));
    const version = Math.max(0, ...(quoteCase.quotations ?? []).map((quotation) => quotation.version)) + 1;
    const quotationNumber = `QUO-PS-${Date.now().toString(36).toUpperCase()}-${version}`;
    const clientSnapshot = clientPricingSnapshot(pricing, quoteCase.profile);
    const internalSnapshot = internalPricingSnapshot(pricing);
    const snapshot = {
      audience: { client: clientSnapshot, internal: internalSnapshot },
      approvedById: actor.user.id,
      approvedAt: now.toISOString(),
      caseId: quoteCase.id,
      caseNumber: quoteCase.caseNumber,
      version,
    };
    const quotation = await tx.quotation.create({
      data: {
        quotationNumber,
        quotationRequestId: quoteCase.quotationRequest?.id,
        partnerQuoteCaseId: quoteCase.id,
        partnerSalesProfileId: quoteCase.profileId,
        status: "FINAL_APPROVED",
        kind: "FINAL",
        origin: "PARTNER",
        createdById: actor.user.id,
        version,
        currency: pricing.currency,
        subtotal: pricing.subtotal,
        discountTotal: pricing.discountTotal,
        deliveryTotal: pricing.deliveryTotal,
        vatTotal: pricing.vatTotal,
        grandTotal: pricing.grandTotal,
        validUntil: pricing.validUntil,
        finalApprovedAt: now,
        issuedAt: now,
        terms: "Issued by Innozanzi on behalf of the partner. Payment and fulfilment are managed by Innozanzi.",
        items: {
          create: pricing.items.map((item) => ({
            productName: item.title,
            sku: null,
            quantity: item.quantity,
            unitPrice: item.approvedGrossUnit,
            costPrice: new Decimal(item.cost),
            vatRate: item.vatUnit.div(item.netUnit).toDecimalPlaces(4),
            vatTotal: item.vatTotal,
            lineTotal: item.lineTotal,
            sourceType: item.sourceType ?? "PARTNER",
            ...(item.sourceId ? { sourceId: item.sourceId } : {}),
            sourceSnapshot: { availabilityFingerprint: item.availabilityFingerprint },
            stockSnapshot: item.available,
          })),
        },
      },
    });
    const quotationId = quotation.id;
    const quotationVersion = await tx.quotationVersion.create({ data: { quotationId, version, kind: "FINAL", createdById: actor.user.id, snapshot } });
    const existingCommission = typeof tx.partnerCommission.findUnique === "function"
      ? await tx.partnerCommission.findUnique({ where: { caseId: quoteCase.id } })
      : null;
    const commission = existingCommission
      ? existingCommission.status !== "ESTIMATED" || existingCommission.paidAt
        ? (() => { throw new PartnerPricingError("This commission has payment history and cannot be mutated by a quotation revision."); })()
        : await tx.partnerCommission.update({
            where: { id: existingCommission.id },
            data: {
              quotationId,
              quotationVersionId: quotationVersion.id,
              method: pricing.commissionMethod,
              approvedBasis: pricing.netSale,
              approvedValue: pricing.commissionValue,
              quotedAmount: pricing.commissionAmount,
              currentAmount: pricing.commissionAmount,
              currency: pricing.currency,
              calculationSnapshot: internalSnapshot,
              status: "ESTIMATED",
              heldAmount: 0,
              adjustedAmount: 0,
              reversedAmount: 0,
              adjustmentReason: null,
            },
          })
      : await tx.partnerCommission.create({
          data: {
            partnershipId: quoteCase.partnershipId,
            caseId: quoteCase.id,
            quotationId,
            quotationVersionId: quotationVersion.id,
            method: pricing.commissionMethod,
            approvedBasis: pricing.netSale,
            approvedValue: pricing.commissionValue,
            quotedAmount: pricing.commissionAmount,
            currentAmount: pricing.commissionAmount,
            currency: pricing.currency,
            calculationSnapshot: internalSnapshot,
            status: "ESTIMATED",
          },
        });
    await tx.partnerCommissionEntry.create({ data: { commissionId: commission.id, type: "ESTIMATE", amount: pricing.commissionAmount, balanceAfter: pricing.commissionAmount, reason: "Partner quotation approved", actorId: actor.user.id, metadata: { quotationId, quotationVersionId: quotationVersion.id } } });
    await tx.partnerQuoteCase.update({ where: { id: quoteCase.id }, data: { activeQuotationId: quotationId, status: "PARTNER_REVIEW" } });
    await tx.quotationRequest.update({ where: { id: quoteCase.quotationRequest!.id }, data: { status: "QUOTED" } });
    await tx.quotationStatusHistory.create({ data: { quotationId, toStatus: "FINAL_APPROVED", actorId: actor.user.id, note: `Partner quotation version ${version} approved.` } });
    await tx.auditLog.create({ data: { actorId: actor.user.id, action: "partner-sales.quotation.approve", entityType: "Quotation", entityId: quotationId, after: { caseId: quoteCase.id, quotationVersionId: quotationVersion.id, commissionId: commission.id, version, commissionOverrideReason: pricing.commissionOverrideReason ?? null } } });
    await stagePartnerSalesEvent(tx, {
      event: quoteCase.status === "REVISION_REQUESTED" ? "REVISION_RESOLVED" : "PRICING_QUOTATION_READY",
      entityId: quoteCase.id,
      caseNumber: quoteCase.caseNumber,
      quoteNumber: quotation.quotationNumber,
      total: pricing.grandTotal.toFixed(2),
      client: { email: quoteCase.partnerClient.email, name: quoteCase.partnerClient.contactName, company: quoteCase.partnerClient.companyName, communicationConsent: quoteCase.partnerClient.communicationConsent },
      partner: quoteCase.profile.contactEmail ? { email: quoteCase.profile.contactEmail, displayName: quoteCase.profile.displayName } : undefined,
      internalMessage: "Approved partner quotation is ready for partner review.",
    });
    return { caseId: quoteCase.id, quotationId, quotationVersionId: quotationVersion.id, commissionId: commission.id, version, grandTotal: pricing.grandTotal.toFixed(2), clientSnapshot };
  }, { isolationLevel: "Serializable" });
  revalidatePath("/admin/partnerships/sales-cases");
  revalidatePath(`/admin/partnerships/sales-cases/${input.caseId}`);
  return result;
}
