import Decimal from "decimal.js";

export const DEFAULT_VAT_RATE = new Decimal("0.15");

export function money(value: Decimal.Value) {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function calculateVatInclusive(value: Decimal.Value, vatRate = DEFAULT_VAT_RATE) {
  const gross = money(value);
  const net = money(gross.div(vatRate.plus(1)));
  return { net, vat: money(gross.minus(net)), gross };
}

export function formatZar(value: Decimal.Value) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(new Decimal(value).toNumber());
}
