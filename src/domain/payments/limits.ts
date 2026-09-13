import Decimal from "decimal.js";

// PayFast documents R5 as the minimum for live transactions.
export function paymentAmountError(provider: string, amount: Decimal.Value): string | null {
  if (provider === "PAYFAST" && new Decimal(amount).lt(5)) {
    return "PayFast requires a total of at least R5.00. Add items to your basket or choose another payment method.";
  }
  return null;
}
