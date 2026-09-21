import { beforeEach,expect,it,vi } from "vitest";

const mocks=vi.hoisted(()=>({findUnique:vi.fn(),lookup:vi.fn(),accept:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{payment:{findUnique:mocks.findUnique}}}));
vi.mock("@/integrations/payments/lookup",()=>({lookupPendingPayment:mocks.lookup}));
vi.mock("@/domain/payments/recovery",()=>({acceptVerifiedPayment:mocks.accept}));
import { recoverPaymentAfterReturn } from "@/domain/payments/return-recovery";

const payment={status:"PENDING",provider:"OZOW",externalReference:"reference",createdAt:new Date("2026-09-21T10:00:00Z")};
const event={eventId:"transaction",externalReference:"reference",status:"PAID" as const,amount:"5.00",currency:"ZAR",raw:{verification:"provider"}};

beforeEach(()=>{vi.clearAllMocks();mocks.findUnique.mockResolvedValue(payment);mocks.lookup.mockResolvedValue({reason:"PROVIDER_VERIFIED",event});mocks.accept.mockResolvedValue({duplicate:false,paymentId:"payment"});});

it("finalizes an Ozow return only from fresh provider evidence",async()=>{
  await expect(recoverPaymentAfterReturn("payment")).resolves.toBe("paid");
  expect(mocks.lookup).toHaveBeenCalledWith("OZOW","reference",payment.createdAt);
  expect(mocks.accept).toHaveBeenCalledWith("OZOW",event);
});

it("leaves PayFast processing when lookup can only request an ITN resend",async()=>{
  mocks.findUnique.mockResolvedValue({...payment,provider:"PAYFAST"});mocks.lookup.mockResolvedValue({reason:"PAYFAST_ITN_RESEND_REQUIRED"});
  await expect(recoverPaymentAfterReturn("payment")).resolves.toBe("processing");
  expect(mocks.accept).not.toHaveBeenCalled();
});

it("leaves the order recoverable when the provider is temporarily unavailable",async()=>{
  mocks.lookup.mockRejectedValue(new Error("provider unavailable"));
  await expect(recoverPaymentAfterReturn("payment")).resolves.toBe("processing");
  expect(mocks.accept).not.toHaveBeenCalled();
});

it("does not re-query a payment already finalized",async()=>{
  mocks.findUnique.mockResolvedValue({...payment,status:"PAID"});
  await expect(recoverPaymentAfterReturn("payment")).resolves.toBe("paid");
  expect(mocks.lookup).not.toHaveBeenCalled();
});
