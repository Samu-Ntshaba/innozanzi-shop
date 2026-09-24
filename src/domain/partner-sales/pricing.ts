import Decimal from "decimal.js";
import type { PartnerCommissionMethod } from "@/generated/prisma/enums";
import { calculatePartnerCommission } from "@/domain/partner-sales/commission";
import {
  contributionAtPrice,
  protectedPrice,
} from "@/domain/commerce/engine";
import {
  DEFAULT_COMMERCE,
  type CommerceSettings,
} from "@/domain/commerce/config";
import { partnerQuoteExpiry } from "@/domain/quotations/lifecycle";

export type PartnerPricingGateway = "PAYFAST" | "OZOW" | "EFT";

export type PartnerPricingItem = {
  id: string;
  sourceType?: string;
  sourceId?: string;
  title: string;
  quantity: number;
  cost: Decimal.Value;
  available: number;
  availabilityFingerprint?: string | null;
  currentAvailabilityFingerprint?: string | null;
};

export type PartnerPricingInput = {
  items: readonly PartnerPricingItem[];
  settings?: CommerceSettings;
  gateway?: PartnerPricingGateway;
  deliveryTotal?: Decimal.Value;
  discountTotal?: Decimal.Value;
  currency?: string;
  defaultCommissionMethod?: PartnerCommissionMethod;
  defaultCommissionValue?: Decimal.Value;
  commissionMethod?: PartnerCommissionMethod;
  commissionValue?: Decimal.Value;
  commissionOverrideReason?: string;
  approvedUnitPrices?: Record<string, Decimal.Value>;
  validUntil?: Date;
  calculatedAt?: Date;
};

export type PartnerPricingLine = PartnerPricingItem & {
  approvedGrossUnit: Decimal;
  protectedGrossUnit: Decimal;
  netUnit: Decimal;
  vatUnit: Decimal;
  lineTotal: Decimal;
  vatTotal: Decimal;
  contribution: Decimal;
  fees: Decimal;
  reserve: Decimal;
  landed: Decimal;
};

export type PartnerPricingResult = {
  currency: string;
  gateway: PartnerPricingGateway;
  calculatedAt: Date;
  validUntil: Date;
  items: PartnerPricingLine[];
  subtotal: Decimal;
  vatTotal: Decimal;
  deliveryTotal: Decimal;
  discountTotal: Decimal;
  grandTotal: Decimal;
  netSale: Decimal;
  fees: Decimal;
  reserve: Decimal;
  landed: Decimal;
  contribution: Decimal;
  commissionMethod: PartnerCommissionMethod;
  commissionValue: Decimal;
  commissionOverrideReason?: string;
  commissionAmount: Decimal;
  expectedContribution: Decimal;
};

export class PartnerPricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerPricingError";
  }
}

function money(value: Decimal.Value, label: string) {
  let decimal: Decimal;
  try {
    decimal = new Decimal(value);
  } catch {
    throw new PartnerPricingError(`${label} must be a finite amount.`);
  }
  if (!decimal.isFinite() || decimal.isNegative()) {
    throw new PartnerPricingError(`${label} must be a finite non-negative amount.`);
  }
  return decimal;
}

function positiveMoney(value: Decimal.Value, label: string) {
  const result = money(value, label);
  if (result.isZero()) throw new PartnerPricingError(`${label} must be positive.`);
  return result;
}

function decimalJson(value: Decimal) {
  return value.toFixed(2);
}

/**
 * Calculates the complete internal quote preview. Values returned here are
 * Admin-only; callers rendering client material must use clientPricingSnapshot.
 */
export function calculatePartnerPricing(input: PartnerPricingInput): PartnerPricingResult {
  if (!input.items.length) throw new PartnerPricingError("A partner quotation needs at least one item.");
  const settings = input.settings ?? DEFAULT_COMMERCE;
  const gateway = input.gateway ?? "PAYFAST";
  const calculatedAt = input.calculatedAt ?? new Date();
  const validUntil = input.validUntil ?? partnerQuoteExpiry(calculatedAt);
  if (validUntil <= calculatedAt) throw new PartnerPricingError("Quotation expiry must be in the future.");

  const deliveryTotal = money(input.deliveryTotal ?? 0, "Delivery total");
  const discountTotal = money(input.discountTotal ?? 0, "Discount total");
  const vatRate = settings.vatRegistered ? new Decimal(settings.vatPercent).div(100) : new Decimal(0);
  const lines: PartnerPricingLine[] = [];

  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new PartnerPricingError(`Quantity for ${item.title} must be a positive whole number.`);
    }
    if (!Number.isFinite(item.available) || item.available < item.quantity) {
      throw new PartnerPricingError(`${item.title} is no longer sufficiently available.`);
    }
    if (item.availabilityFingerprint && item.currentAvailabilityFingerprint && item.availabilityFingerprint !== item.currentAvailabilityFingerprint) {
      throw new PartnerPricingError(`${item.title} cost or stock changed; refresh the quote before approval.`);
    }
    const cost = positiveMoney(item.cost, `${item.title} cost`);
    const floor = protectedPrice(cost, settings, gateway === "EFT" ? "PAYFAST" : gateway);
    const requested = input.approvedUnitPrices?.[item.id];
    const approvedGrossUnit = requested === undefined ? floor.gross : positiveMoney(requested, `${item.title} price`);
    if (approvedGrossUnit.lt(floor.gross)) {
      throw new PartnerPricingError(`${item.title} price cannot be below the protected floor.`);
    }
    const contribution = contributionAtPrice(cost, approvedGrossUnit, settings, gateway);
    const netUnit = approvedGrossUnit.div(vatRate.plus(1)).toDecimalPlaces(2);
    const vatUnit = approvedGrossUnit.minus(netUnit).toDecimalPlaces(2);
    lines.push({
      ...item,
      approvedGrossUnit,
      protectedGrossUnit: floor.gross,
      netUnit,
      vatUnit,
      lineTotal: approvedGrossUnit.mul(item.quantity).toDecimalPlaces(2),
      vatTotal: vatUnit.mul(item.quantity).toDecimalPlaces(2),
      contribution: new Decimal(contribution.contribution),
      fees: new Decimal(contribution.fees),
      reserve: new Decimal(contribution.reserve),
      landed: new Decimal(contribution.landed),
    });
  }

  const subtotal = lines.reduce((sum, line) => sum.plus(line.netUnit.mul(line.quantity)), new Decimal(0)).toDecimalPlaces(2);
  const vatTotal = lines.reduce((sum, line) => sum.plus(line.vatTotal), new Decimal(0)).toDecimalPlaces(2);
  const netDelivery = deliveryTotal.div(vatRate.plus(1)).toDecimalPlaces(2);
  const netDiscount = discountTotal.div(vatRate.plus(1)).toDecimalPlaces(2);
  const netSale = subtotal.plus(netDelivery).minus(netDiscount).toDecimalPlaces(2);
  if (netSale.lte(0)) throw new PartnerPricingError("Quotation net sale must be positive.");
  const grandTotal = lines.reduce((sum, line) => sum.plus(line.lineTotal), new Decimal(0)).plus(deliveryTotal).minus(discountTotal).toDecimalPlaces(2);
  if (grandTotal.lte(0)) throw new PartnerPricingError("Quotation total must be positive.");

  const method = input.commissionMethod ?? input.defaultCommissionMethod ?? "PERCENTAGE";
  const value = money(input.commissionValue ?? input.defaultCommissionValue ?? 0, "Commission value");
  const defaultMethod = input.defaultCommissionMethod ?? method;
  const defaultValue = money(input.defaultCommissionValue ?? value, "Default commission value");
  const override = method !== defaultMethod || !value.eq(defaultValue);
  const reason = input.commissionOverrideReason?.trim();
  if (override && (!reason || reason.length < 5)) {
    throw new PartnerPricingError("A commission override requires an audit reason.");
  }
  const commissionAmount = calculatePartnerCommission({ method, value, netSale });
  const contribution = lines.reduce((sum, line) => sum.plus(line.contribution.mul(line.quantity)), new Decimal(0)).plus(netDelivery).minus(netDiscount).toDecimalPlaces(2);
  const expectedContribution = contribution.minus(commissionAmount).toDecimalPlaces(2);
  if (expectedContribution.isNegative()) {
    throw new PartnerPricingError("Expected Innozanzi contribution cannot be negative after commission.");
  }

  return {
    currency: input.currency ?? "ZAR",
    gateway,
    calculatedAt,
    validUntil,
    items: lines,
    subtotal,
    vatTotal,
    deliveryTotal,
    discountTotal,
    grandTotal,
    netSale,
    fees: lines.reduce((sum, line) => sum.plus(line.fees.mul(line.quantity)), new Decimal(0)),
    reserve: lines.reduce((sum, line) => sum.plus(line.reserve.mul(line.quantity)), new Decimal(0)),
    landed: lines.reduce((sum, line) => sum.plus(line.landed.mul(line.quantity)), new Decimal(0)),
    contribution,
    commissionMethod: method,
    commissionValue: value,
    commissionOverrideReason: reason,
    commissionAmount,
    expectedContribution,
  };
}

export function internalPricingSnapshot(result: PartnerPricingResult) {
  return {
    currency: result.currency,
    gateway: result.gateway,
    calculatedAt: result.calculatedAt.toISOString(),
    validUntil: result.validUntil.toISOString(),
    items: result.items.map((item) => ({
      id: item.id,
      sourceType: item.sourceType ?? null,
      sourceId: item.sourceId ?? null,
      title: item.title,
      quantity: item.quantity,
      cost: decimalJson(new Decimal(item.cost)),
      available: item.available,
      availabilityFingerprint: item.availabilityFingerprint ?? null,
      approvedGrossUnit: decimalJson(item.approvedGrossUnit),
      protectedGrossUnit: decimalJson(item.protectedGrossUnit),
      netUnit: decimalJson(item.netUnit),
      vatUnit: decimalJson(item.vatUnit),
      lineTotal: decimalJson(item.lineTotal),
      vatTotal: decimalJson(item.vatTotal),
      contribution: decimalJson(item.contribution),
      fees: decimalJson(item.fees),
      reserve: decimalJson(item.reserve),
      landed: decimalJson(item.landed),
    })),
    totals: {
      subtotal: decimalJson(result.subtotal),
      vatTotal: decimalJson(result.vatTotal),
      deliveryTotal: decimalJson(result.deliveryTotal),
      discountTotal: decimalJson(result.discountTotal),
      grandTotal: decimalJson(result.grandTotal),
      netSale: decimalJson(result.netSale),
      fees: decimalJson(result.fees),
      reserve: decimalJson(result.reserve),
      landed: decimalJson(result.landed),
      contribution: decimalJson(result.contribution),
      commissionAmount: decimalJson(result.commissionAmount),
      expectedContribution: decimalJson(result.expectedContribution),
    },
    commission: {
      method: result.commissionMethod,
      value: decimalJson(result.commissionValue),
      overrideReason: result.commissionOverrideReason ?? null,
    },
  };
}

export function clientPricingSnapshot(result: PartnerPricingResult, partner?: { displayName?: string | null; publicSlug?: string | null }) {
  return {
    currency: result.currency,
    partner: { displayName: partner?.displayName ?? null, publicSlug: partner?.publicSlug ?? null },
    validUntil: result.validUntil.toISOString(),
    items: result.items.map((item) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      unitPrice: decimalJson(item.approvedGrossUnit),
      vatTotal: decimalJson(item.vatTotal),
      lineTotal: decimalJson(item.lineTotal),
    })),
    subtotal: decimalJson(result.subtotal),
    vatTotal: decimalJson(result.vatTotal),
    deliveryTotal: decimalJson(result.deliveryTotal),
    discountTotal: decimalJson(result.discountTotal),
    grandTotal: decimalJson(result.grandTotal),
    merchantDisclosure: "Quotation issued by Innozanzi on behalf of the partner. Payment and fulfilment are managed by Innozanzi.",
  };
}
