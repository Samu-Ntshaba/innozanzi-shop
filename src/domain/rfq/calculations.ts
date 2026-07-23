import Decimal from "decimal.js";

export type PricingLine = {
  quantity: Decimal.Value;
  unitCost: Decimal.Value;
  pricingMethod: "MARKUP" | "MARGIN";
  pricingPercent: Decimal.Value;
  vatRate?: Decimal.Value;
  isService?: boolean;
};

export function sellingUnitPrice(
  costValue: Decimal.Value,
  method: "MARKUP" | "MARGIN",
  percentValue: Decimal.Value,
) {
  const cost = new Decimal(costValue);
  const rate = new Decimal(percentValue).div(100);
  if (cost.isNegative() || rate.isNegative()) throw new Error("Cost and pricing percentage cannot be negative.");
  if (method === "MARGIN" && rate.greaterThanOrEqualTo(1)) throw new Error("Margin must be below 100%.");
  return (method === "MARKUP" ? cost.mul(rate.plus(1)) : cost.div(new Decimal(1).minus(rate))).toDecimalPlaces(4);
}

export function calculateRfqPricing(
  lines: PricingLine[],
  additionalCosts: Decimal.Value[] = [],
  commission: Decimal.Value = 0,
) {
  let productCost = new Decimal(0);
  let serviceCost = new Decimal(0);
  let sellingBeforeVat = new Decimal(0);
  let vat = new Decimal(0);

  const calculatedLines = lines.map((line) => {
    const quantity = new Decimal(line.quantity);
    const unitCost = new Decimal(line.unitCost);
    if (!quantity.isPositive()) throw new Error("Quantity must be positive.");
    const sellingPricePerUnit = sellingUnitPrice(unitCost, line.pricingMethod, line.pricingPercent);
    const costSubtotal = unitCost.mul(quantity).toDecimalPlaces(4);
    const sellingSubtotal = sellingPricePerUnit.mul(quantity).toDecimalPlaces(4);
    const vatAmount = sellingSubtotal.mul(line.vatRate ?? "0.15").toDecimalPlaces(4);
    const profit = sellingSubtotal.minus(costSubtotal).toDecimalPlaces(4);
    if (line.isService) serviceCost = serviceCost.plus(costSubtotal);
    else productCost = productCost.plus(costSubtotal);
    sellingBeforeVat = sellingBeforeVat.plus(sellingSubtotal);
    vat = vat.plus(vatAmount);
    return { sellingPricePerUnit, costSubtotal, sellingSubtotal, vatAmount, profit };
  });

  const totalAdditionalCost = additionalCosts.reduce<Decimal>((sum, value) => sum.plus(value), new Decimal(0));
  const totalCostBeforeVat = productCost.plus(serviceCost).plus(totalAdditionalCost);
  const grossProfit = sellingBeforeVat.minus(totalCostBeforeVat);
  const commissionAmount = new Decimal(commission);
  return {
    lines: calculatedLines,
    totalProductCost: productCost.toDecimalPlaces(4),
    totalServiceCost: serviceCost.toDecimalPlaces(4),
    totalAdditionalCost: totalAdditionalCost.toDecimalPlaces(4),
    totalCostBeforeVat: totalCostBeforeVat.toDecimalPlaces(4),
    sellingBeforeVat: sellingBeforeVat.toDecimalPlaces(4),
    totalVat: vat.toDecimalPlaces(4),
    sellingIncludingVat: sellingBeforeVat.plus(vat).toDecimalPlaces(4),
    grossProfit: grossProfit.toDecimalPlaces(4),
    grossProfitPercent: sellingBeforeVat.isZero() ? new Decimal(0) : grossProfit.div(sellingBeforeVat).mul(100).toDecimalPlaces(4),
    commissionAmount: commissionAmount.toDecimalPlaces(4),
    expectedProfit: grossProfit.minus(commissionAmount).toDecimalPlaces(4),
  };
}
