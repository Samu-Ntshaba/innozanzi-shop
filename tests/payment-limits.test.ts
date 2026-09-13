import { expect, it } from "vitest";
import { paymentAmountError } from "@/domain/payments/limits";
import { hostedFields } from "@/integrations/payments/approved-gateways";
import { afterEach, vi } from "vitest";

afterEach(() => vi.unstubAllEnvs());

it.each(["0", "1", "4.99"])("rejects PayFast totals below R5: %s", amount => {
  expect(paymentAmountError("PAYFAST", amount)).toContain("at least R5.00");
});
it.each(["5", "5.00", "123.45"])("accepts PayFast totals from R5: %s", amount => {
  expect(paymentAmountError("PAYFAST", amount)).toBeNull();
});
it("does not apply PayFast limits to Ozow", () => {
  expect(paymentAmountError("OZOW", "1")).toBeNull();
});
it("blocks an existing small payment before building the PayFast form", () => {
  for (const [key, value] of Object.entries({
    PAYFAST_ENABLED: "true", PAYFAST_SANDBOX: "false",
    PAYFAST_MERCHANT_ID: "10000100", PAYFAST_MERCHANT_KEY: "test-key", PAYFAST_PASSPHRASE: "test-pass",
  })) vi.stubEnv(key, value);
  expect(() => hostedFields("PAYFAST", { id: "pending-payment", amount: "1.00", email: "test@example.com", orderId: "order" }, "https://shop.example")).toThrow("at least R5.00");
});
