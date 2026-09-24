import { createHash } from "node:crypto";
import Decimal from "decimal.js";

export type PartnerAvailabilityFingerprintInput = {
  sourceType: string;
  sourceId: string;
  baseCost: Decimal.Value;
  effectiveCost?: Decimal.Value;
  promotionalCost?: Decimal.Value | null;
  promotionActive?: boolean;
  promotionStartsAt?: Date | string | null;
  promotionEndsAt?: Date | string | null;
  available: number;
  state: string;
  details?: unknown;
};

function money(value: Decimal.Value | null | undefined) {
  if (value === null || value === undefined) return null;
  const raw = value && typeof value === "object" && "toString" in value ? value.toString() : value;
  const decimal = new Decimal(raw as Decimal.Value);
  return decimal.isFinite() ? decimal.toFixed(4) : null;
}

function date(value: Date | string | null | undefined) {
  if (!value) return null;
  const result = value instanceof Date ? value : new Date(value);
  return Number.isFinite(result.getTime()) ? result.toISOString() : null;
}

/**
 * The only availability fingerprint contract used by partner sales. The
 * promotion window is part of the evidence, while the current time is used
 * only to decide whether the window is active. This keeps a snapshot stable
 * until the source's effective cost, stock, state, or promotion semantics
 * actually change.
 */
export function partnerAvailabilityFingerprint(input: PartnerAvailabilityFingerprintInput) {
  const evidence = {
    contract: "partner-sales-availability-v1",
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    baseCost: money(input.baseCost),
    effectiveCost: money(input.effectiveCost ?? input.baseCost),
    available: Math.max(0, Math.trunc(input.available)),
    state: input.state,
    promotion: {
      active: Boolean(input.promotionActive),
      cost: money(input.promotionalCost),
      startsAt: date(input.promotionStartsAt),
      endsAt: date(input.promotionEndsAt),
    },
    details: input.details ?? null,
  };
  return createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
}

export function supplierPromotionEvidence(input: {
  costPrice: Decimal.Value | null | undefined;
  promotionalPrice: Decimal.Value | null | undefined;
  promotionStartsAt: Date | null | undefined;
  promotionEndsAt: Date | null | undefined;
  now: Date;
}) {
  const baseCost = money(input.costPrice);
  const promotionalCost = money(input.promotionalPrice);
  const promotionActive = Boolean(
    baseCost &&
      promotionalCost &&
      new Decimal(promotionalCost).gt(0) &&
      new Decimal(promotionalCost).lt(new Decimal(baseCost)) &&
      (!input.promotionStartsAt || input.promotionStartsAt <= input.now) &&
      (!input.promotionEndsAt || input.promotionEndsAt >= input.now),
  );
  return {
    baseCost,
    promotionalCost,
    promotionActive,
    effectiveCost: promotionActive ? promotionalCost : baseCost,
    promotionStartsAt: input.promotionStartsAt ?? null,
    promotionEndsAt: input.promotionEndsAt ?? null,
  };
}

export type LocalProductAvailabilityInput = {
  costPrice: Decimal.Value | null | undefined;
  inventory: Array<{ id: string; onHand: number; reserved: number }>;
  variants: Array<{
    id: string;
    isActive: boolean;
    costPrice: Decimal.Value | null | undefined;
    inventory: { onHand: number; reserved: number } | null;
  }>;
  suppliers: Array<{ costPrice: Decimal.Value | null | undefined }>;
};

export function localProductAvailability(product: LocalProductAvailabilityInput) {
  const activeVariants = (product.variants ?? []).filter((variant) => variant.isActive);
  const fallbackCost = money(product.costPrice ?? product.suppliers?.[0]?.costPrice);
  if (activeVariants.length) {
    const costEvidence = activeVariants.map((variant) => ({
      id: variant.id,
      available: Math.max(0, (variant.inventory?.onHand ?? 0) - (variant.inventory?.reserved ?? 0)),
      cost: money(variant.costPrice) ?? fallbackCost,
    }));
    const stocked = costEvidence.filter((variant) => variant.available > 0);
    const costsValid = stocked.length > 0 && stocked.every((variant) => variant.cost && Number(variant.cost) > 0);
    return {
      available: stocked.reduce((total, variant) => total + variant.available, 0),
      cost: costsValid ? stocked[0]?.cost ?? null : null,
      costEvidence,
    };
  }
  const available = (product.inventory ?? []).reduce((total, row) => total + Math.max(0, row.onHand - row.reserved), 0);
  return {
    available,
    cost: fallbackCost,
    costEvidence: [{ id: "base", available, cost: fallbackCost }],
  };
}
