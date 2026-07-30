import Decimal from "decimal.js";

export type ComboPricingInput = {
  items: Array<{ quantity: number; normalPrice: Decimal.Value; cost: Decimal.Value }>;
  comboPrice: Decimal.Value;
  serviceCost?: Decimal.Value;
  deliveryCost?: Decimal.Value;
  paymentCost?: Decimal.Value;
};

export function calculateComboPricing(input: ComboPricingInput) {
  const normalPrice = input.items.reduce((sum, item) => sum.plus(new Decimal(item.normalPrice).mul(item.quantity)), new Decimal(0));
  const productCost = input.items.reduce((sum, item) => sum.plus(new Decimal(item.cost).mul(item.quantity)), new Decimal(0));
  const totalCost = productCost.plus(input.serviceCost ?? 0).plus(input.deliveryCost ?? 0).plus(input.paymentCost ?? 0);
  const comboPrice = new Decimal(input.comboPrice);
  const discountAmount = Decimal.max(0, normalPrice.minus(comboPrice));
  const discountPercent = normalPrice.gt(0) ? discountAmount.div(normalPrice).mul(100) : new Decimal(0);
  const grossProfit = comboPrice.minus(totalCost);
  const profitMargin = comboPrice.gt(0) ? grossProfit.div(comboPrice).mul(100) : new Decimal(0);
  return { normalPrice, productCost, totalCost, comboPrice, discountAmount, discountPercent, grossProfit, profitMargin };
}

export function validateComboPricing(
  pricing: ReturnType<typeof calculateComboPricing>,
  limits: { minimumProfitAmount: Decimal.Value; minimumProfitMargin: Decimal.Value; maximumDiscountPercent: Decimal.Value },
) {
  const warnings: string[] = [];
  if (pricing.comboPrice.lte(0)) warnings.push("Combo price must be positive.");
  if (pricing.grossProfit.lt(limits.minimumProfitAmount)) warnings.push("Gross profit is below the configured minimum amount.");
  if (pricing.profitMargin.lt(limits.minimumProfitMargin)) warnings.push("Profit margin is below the configured minimum percentage.");
  if (pricing.discountPercent.gt(limits.maximumDiscountPercent)) warnings.push("Discount exceeds the configured maximum percentage.");
  return warnings;
}
