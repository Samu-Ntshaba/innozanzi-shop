import Decimal from "decimal.js";

export const DEFAULT_MARKUP_PERCENT = new Decimal(5);
export const QUOTATION_VALID_DAYS = 7;

export function quotationNumber() {
  return `QUO-${Date.now().toString(36).toUpperCase()}`;
}

export function orderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}`;
}

export async function configuredMarkup() {
  const { prisma } = await import("@/lib/prisma");
  const setting = await prisma.siteSetting.findUnique({ where: { key: "quotation.defaultMarkupPercent" } });
  const raw = setting?.value;
  const value = typeof raw === "number" || typeof raw === "string" ? new Decimal(raw) : DEFAULT_MARKUP_PERCENT;
  return value.isNegative() || value.greaterThan(500) ? DEFAULT_MARKUP_PERCENT : value;
}

export function priceFromCost(cost: Decimal.Value, markupPercent: Decimal.Value, taxable = true) {
  const netUnit = new Decimal(cost).mul(new Decimal(1).plus(new Decimal(markupPercent).div(100))).toDecimalPlaces(2);
  const vatUnit = taxable ? netUnit.mul("0.15").toDecimalPlaces(2) : new Decimal(0);
  return { netUnit, vatUnit, grossUnit: netUnit.plus(vatUnit) };
}

export function quoteTotals(items: Array<{ quantity: number; netUnit: Decimal; vatUnit: Decimal }>, discount = new Decimal(0), delivery = new Decimal(0)) {
  const subtotal = items.reduce((sum, item) => sum.plus(item.netUnit.mul(item.quantity)), new Decimal(0)).toDecimalPlaces(2);
  const vatTotal = items.reduce((sum, item) => sum.plus(item.vatUnit.mul(item.quantity)), new Decimal(0)).toDecimalPlaces(2);
  const grandTotal = subtotal.plus(vatTotal).plus(delivery).minus(discount).toDecimalPlaces(2);
  if (grandTotal.isNegative()) throw new Error("Quotation total cannot be negative.");
  return { subtotal, vatTotal, grandTotal };
}

export const quoteExpiry = () => new Date(Date.now() + QUOTATION_VALID_DAYS * 86_400_000);
