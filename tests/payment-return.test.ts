import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), transaction: vi.fn(), paymentUpdate: vi.fn(), orderUpdate: vi.fn(), historyCreate: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { payment: { findUnique: mocks.findUnique }, $transaction: mocks.transaction } }));
import { GET } from "@/app/api/payments/return/[paymentId]/route";

const id = "11111111-1111-4111-8111-111111111111";
const payment = { id, orderId: "22222222-2222-4222-8222-222222222222", status: "PENDING", order: { orderNumber: "ORD-TEST", status: "AWAITING_PAYMENT", paymentStatus: "PENDING" } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue(payment);
  mocks.transaction.mockImplementation(async callback => callback({
    $queryRaw: vi.fn(),
    payment: { findUniqueOrThrow: vi.fn().mockResolvedValue(payment), update: mocks.paymentUpdate },
    order: { update: mocks.orderUpdate },
    orderStatusHistory: { create: mocks.historyCreate },
  }));
});

it("records a cancelled Ozow attempt and returns to the exact retryable order", async () => {
  const response = await GET(new Request("https://shop.example/api/payments/return/" + id + "?result=cancelled"), { params: Promise.resolve({ paymentId: id }) });
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("https://shop.innozanzi.co.za/account/orders/ORD-TEST?payment=cancelled");
  expect(mocks.paymentUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "CANCELLED" }) }));
  expect(mocks.orderUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { paymentStatus: "CANCELLED" } }));
});

it("does not mark a successful browser return paid or cancelled before the verified webhook", async () => {
  const response = await GET(new Request("https://shop.example/api/payments/return/" + id + "?result=success"), { params: Promise.resolve({ paymentId: id }) });
  expect(response.headers.get("location")).toContain("/account/orders/ORD-TEST?payment=processing");
  expect(mocks.transaction).not.toHaveBeenCalled();
});
