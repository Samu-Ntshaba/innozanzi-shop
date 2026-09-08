import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ cart: vi.fn(), transaction: vi.fn(), payment: vi.fn() }));
vi.mock("@/domain/auth/session", () => ({ requireUser: async () => ({ user: { id: "user" } }) }));
vi.mock("@/domain/addresses/service", () => ({ deliveryFromForm: async () => { throw new Error("Complete your delivery address."); } }));
vi.mock("@/domain/cart/service", () => ({ getCurrentCart: mocks.cart }));
vi.mock("@/domain/catalogue/product-source", () => ({ resolveQuotationCart: vi.fn() }));
vi.mock("@/domain/quotations/lifecycle", () => ({ orderNumber: vi.fn() }));
vi.mock("@/domain/payments/orchestration", () => ({ beginHostedOrderPayment: mocks.payment }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
import { placeRetailOrder } from "@/domain/checkout/actions";
it("does not create an order or initiate payment without a delivery address", async () => {
  const form = new FormData(); form.set("paymentMethod", "PAYFAST");
  expect(await placeRetailOrder({ error: "" }, form)).toEqual({ error: "Complete your delivery address." });
  expect(mocks.cart).not.toHaveBeenCalled(); expect(mocks.transaction).not.toHaveBeenCalled(); expect(mocks.payment).not.toHaveBeenCalled();
});
