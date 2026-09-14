import { beforeEach,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({transaction:vi.fn(),send:vi.fn(),lock:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:mocks.transaction}}));
vi.mock("@/integrations/email/provider",()=>({mailDeliveryMode:()=>"api",getEmailProvider:()=>({send:mocks.send})}));
import { enqueueEmail } from "@/integrations/email/outbox";
let row:Record<string,unknown>|null;
const message={to:"sandbox@example.com",subject:"Order confirmed",text:"Paid",html:"<p>Paid</p>",idempotencyKey:"order:test"};
beforeEach(()=>{
 vi.clearAllMocks();row=null;
 mocks.send.mockResolvedValue({messageId:"provider-1"});
 mocks.transaction.mockImplementation(async fn=>fn({$queryRaw:mocks.lock,notification:{findFirst:async()=>row,create:async({data}:{data:Record<string,unknown>})=>{row={id:"notification",...data};return row;},update:async({data}:{data:Record<string,unknown>})=>{row={...row,...data};return row;}}}));
});
it("does not resend an already recorded successful confirmation",async()=>{
 await enqueueEmail(message);await enqueueEmail(message);
 expect(mocks.send).toHaveBeenCalledTimes(1);expect(mocks.lock).toHaveBeenCalledTimes(2);expect(row?.status).toBe("SENT");
});
it("commits a failed delivery record before surfacing the provider error and can retry it",async()=>{
 mocks.send.mockRejectedValueOnce(new Error("provider unavailable"));
 await expect(enqueueEmail(message)).rejects.toThrow("provider unavailable");
 expect(row?.status).toBe("FAILED");
 await enqueueEmail(message);expect(row?.status).toBe("SENT");expect(mocks.send).toHaveBeenCalledTimes(2);
});
