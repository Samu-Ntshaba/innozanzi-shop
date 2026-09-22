import Decimal from "decimal.js";
import type { PartnerCommissionMethod } from "@/generated/prisma/enums";

export type CalculatePartnerCommissionInput = {
  method: PartnerCommissionMethod;
  value: Decimal.Value;
  netSale: Decimal.Value;
};

export type CommissionEligibilityInput = {
  orderCompleted: boolean;
  financiallyReconciled: boolean;
  refundAmount?: Decimal.Value;
  hasCancellation?: boolean;
  hasChargeback?: boolean;
  hasDispute?: boolean;
  hasReturnHold?: boolean;
  hasUnresolvedHold?: boolean;
};

export type CommissionEligibilityReason =
  | "ORDER_NOT_COMPLETED"
  | "FINANCIAL_RECONCILIATION_PENDING"
  | "REFUND"
  | "CANCELLATION"
  | "CHARGEBACK"
  | "DISPUTE"
  | "RETURN_HOLD"
  | "COMMISSION_HOLD";

function finiteDecimal(value: Decimal.Value, label: string) {
  let decimal: Decimal;
  try {
    decimal = new Decimal(value);
  } catch {
    throw new Error(`${label} must be finite.`);
  }
  if (!decimal.isFinite()) throw new Error(`${label} must be finite.`);
  return decimal;
}

function requireNonNegative(value: Decimal, label: string) {
  if (value.isNegative()) throw new Error(`${label} cannot be negative.`);
}

export function calculatePartnerCommission({ method, value, netSale }: CalculatePartnerCommissionInput): Decimal {
  const approvedValue = finiteDecimal(value, "Commission value");
  const sale = finiteDecimal(netSale, "Net sale");
  requireNonNegative(approvedValue, "Commission value");
  requireNonNegative(sale, "Net sale");

  if (method === "PERCENTAGE") {
    if (approvedValue.greaterThan(100)) throw new Error("Percentage commission cannot exceed 100%.");
    return sale.mul(approvedValue).div(100);
  }

  if (approvedValue.greaterThan(sale)) {
    throw new Error("Fixed commission cannot exceed the net sale.");
  }
  return approvedValue;
}

export function commissionEligibility(input: CommissionEligibilityInput): { eligible: boolean; reasons: CommissionEligibilityReason[] } {
  const reasons: CommissionEligibilityReason[] = [];
  if (!input.orderCompleted) reasons.push("ORDER_NOT_COMPLETED");
  if (!input.financiallyReconciled) reasons.push("FINANCIAL_RECONCILIATION_PENDING");
  if (input.refundAmount !== undefined) {
    const refundAmount = finiteDecimal(input.refundAmount, "Refund amount");
    requireNonNegative(refundAmount, "Refund amount");
    if (refundAmount.greaterThan(0)) reasons.push("REFUND");
  }
  if (input.hasCancellation) reasons.push("CANCELLATION");
  if (input.hasChargeback) reasons.push("CHARGEBACK");
  if (input.hasDispute) reasons.push("DISPUTE");
  if (input.hasReturnHold) reasons.push("RETURN_HOLD");
  if (input.hasUnresolvedHold) reasons.push("COMMISSION_HOLD");
  return { eligible: reasons.length === 0, reasons };
}
