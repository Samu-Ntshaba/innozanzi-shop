import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { lookupPendingPayment } from "@/integrations/payments/lookup";
beforeEach(()=>{vi.stubEnv("OZOW_ENABLED","true");vi.stubEnv("OZOW_SITE_CODE","site");vi.stubEnv("OZOW_API_KEY","api-secret");vi.stubEnv("OZOW_PRIVATE_KEY","private-secret");vi.stubEnv("OZOW_TEST_MODE","false");});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
const row={TransactionId:"tx",TransactionReference:"payment",SiteCode:"site",CurrencyCode:"ZAR",Amount:"5.00",Status:"Complete",IsTest:false};
it("finds an Ozow payment by the merchant reference without needing a browser or transaction ID",async()=>{
 const fetcher=vi.fn().mockResolvedValue(Response.json([row]));vi.stubGlobal("fetch",fetcher);
 expect(await lookupPendingPayment("OZOW","payment",new Date())).toMatchObject({event:{status:"PAID",amount:"5.00",eventId:"tx"}});
 expect(String(fetcher.mock.calls[0][0])).toContain("GetTransactionByReference?");
});
it.each([{...row,SiteCode:"different"},{...row,IsTest:true},{...row,CurrencyCode:"USD"},{...row,TransactionReference:"other"}])("does not accept a lookup outside the expected merchant, environment, currency or reference",async value=>{
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json([value])));
 expect((await lookupPendingPayment("OZOW","payment",new Date())).event).toBeUndefined();
});
it("keeps ambiguous multiple captures for finance review",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json([row,{...row,TransactionId:"another"}])));
 expect(await lookupPendingPayment("OZOW","payment",new Date())).toMatchObject({reason:"MULTIPLE_PROVIDER_TRANSACTIONS"});
});
it("does not infer failure from an empty lookup",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json([])));
 expect(await lookupPendingPayment("OZOW","payment",new Date())).toEqual({reason:"NO_PROVIDER_CONFIRMATION"});
});
it("accepts the documented transaction response without IsTest because the API query selects the environment",async()=>{
 const {IsTest:ignored,...documented}=row;void ignored;
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json([documented])));
 expect((await lookupPendingPayment("OZOW","payment",new Date())).event?.status).toBe("PAID");
});
