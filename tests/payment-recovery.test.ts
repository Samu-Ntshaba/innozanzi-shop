import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({find:vi.fn(),upsert:vi.fn(),update:vi.fn(),process:vi.fn(),jobs:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{payment:{findUnique:mocks.find},notification:{upsert:mocks.upsert,update:mocks.update,findMany:mocks.jobs}}}));
vi.mock("@/domain/payments/webhooks",()=>({processPaymentEvent:mocks.process}));
import { acceptVerifiedPayment, retryVerifiedPayments } from "@/domain/payments/recovery";
const event={eventId:"tx-1",externalReference:"payment-1",status:"PAID" as const,amount:"5.00",currency:"ZAR",raw:{providerId:"tx-1"}};
beforeEach(()=>{vi.clearAllMocks();mocks.find.mockResolvedValue({id:"payment-1",externalReference:"payment-1",amount:"5.00",currency:"ZAR"});mocks.upsert.mockResolvedValue({id:"job-1",status:"PENDING"});mocks.process.mockResolvedValue({duplicate:false,paymentId:"payment-1"});});
it("durably saves verified evidence before trying the financial transaction",async()=>{
 mocks.process.mockRejectedValueOnce(new Error("database unavailable"));
 await expect(acceptVerifiedPayment("PAYFAST",event)).rejects.toThrow("database unavailable");
 expect(mocks.upsert).toHaveBeenCalled();expect(mocks.update).not.toHaveBeenCalled();
 mocks.jobs.mockResolvedValue([{id:"job-1",data:{provider:"PAYFAST",event}}]);
 expect(await retryVerifiedPayments()).toEqual({checked:1,failed:0});
 expect(mocks.process).toHaveBeenCalledTimes(2);expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:"SENT"})}));
});
it("rejects a mismatched amount before storing replayable evidence",async()=>{
 await expect(acceptVerifiedPayment("PAYFAST",{...event,amount:"1.00"})).rejects.toThrow("amount mismatch");
 expect(mocks.upsert).not.toHaveBeenCalled();expect(mocks.process).not.toHaveBeenCalled();
});
it("uses one durable job for duplicate delivery and keeps the idempotent processor authoritative",async()=>{
 await acceptVerifiedPayment("PAYFAST",event);await acceptVerifiedPayment("PAYFAST",event);
 expect(mocks.upsert.mock.calls[0][0].where).toEqual(mocks.upsert.mock.calls[1][0].where);
 expect(mocks.process).toHaveBeenCalledTimes(2);
});
