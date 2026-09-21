import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), transaction: vi.fn(), paymentUpdate: vi.fn(), orderUpdate: vi.fn(), historyCreate: vi.fn(), recover:vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { payment: { findUnique: mocks.findUnique }, $transaction: mocks.transaction } }));
vi.mock("@/domain/payments/return-recovery",()=>({recoverPaymentAfterReturn:mocks.recover}));
import { GET } from "@/app/api/payments/return/[paymentId]/route";

const id = "11111111-1111-4111-8111-111111111111";
const payment = { id, orderId: "22222222-2222-4222-8222-222222222222", status: "PENDING", order: { orderNumber: "ORD-TEST", status: "AWAITING_PAYMENT", paymentStatus: "PENDING" } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue(payment);
  mocks.recover.mockResolvedValue("processing");
  mocks.transaction.mockImplementation(async callback => callback({
    $queryRaw: vi.fn(),
    payment: { findUniqueOrThrow: vi.fn().mockResolvedValue(payment), update: mocks.paymentUpdate },
    order: { update: mocks.orderUpdate },
    orderStatusHistory: { create: mocks.historyCreate },
  }));
});

it("returns to the order without treating browser cancellation as payment evidence", async () => {
  const response = await GET(new Request("https://shop.example/api/payments/return/" + id + "?result=cancelled"), { params: Promise.resolve({ paymentId: id }) });
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("https://shop.innozanzi.co.za/account/orders/ORD-TEST?payment=cancelled");
  expect(mocks.transaction).not.toHaveBeenCalled();
});

it("does not mark a successful browser return paid or cancelled before the verified webhook", async () => {
  const response = await GET(new Request("https://shop.example/api/payments/return/" + id + "?result=success"), { params: Promise.resolve({ paymentId: id }) });
  expect(response.headers.get("location")).toContain("/account/orders/ORD-TEST?payment=processing");
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.recover).toHaveBeenCalledWith(id);
});

it("shows success only after server-side provider evidence is finalized",async()=>{
  mocks.recover.mockResolvedValue("paid");
  const response=await GET(new Request("https://shop.example/api/payments/return/"+id+"?result=success"),{params:Promise.resolve({paymentId:id})});
  expect(response.headers.get("location")).toContain("?payment=success");
});

it("does not run provider recovery for an untrusted cancellation return",async()=>{
  await GET(new Request("https://shop.example/api/payments/return/"+id+"?result=cancelled"),{params:Promise.resolve({paymentId:id})});
  expect(mocks.recover).not.toHaveBeenCalled();
});
