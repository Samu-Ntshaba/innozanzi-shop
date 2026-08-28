import Decimal from "decimal.js";

export const FREE_DELIVERY_THRESHOLD = new Decimal(1500);
export const STANDARD_DELIVERY_FEE = new Decimal(100);

export function deliveryFee(productTotal: Decimal.Value) {
  const total = new Decimal(productTotal);
  return total.gt(0) && total.lt(FREE_DELIVERY_THRESHOLD) ? STANDARD_DELIVERY_FEE : new Decimal(0);
}

