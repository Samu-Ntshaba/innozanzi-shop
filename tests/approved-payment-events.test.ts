import Decimal from "decimal.js";
import { beforeEach,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({transaction:vi.fn(),notify:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:mocks.transaction}}));
vi.mock("@/domain/notifications/order-alerts",()=>({notifyStaffOfPaidOrder:mocks.notify}));
import { processPaymentEvent } from "@/domain/payments/webhooks";
import { normalizeOzowBoolean, ozowNotificationHash, ozowTransactionRows, selectVerifiedOzowTransaction } from "@/integrations/payments/ozow-contract";
let orderStatus="AWAITING_PAYMENT";let status="PENDING";let otherPaid=false;let newerAttempt=false;const updates=vi.fn();const orderUpdate=vi.fn();const history=vi.fn();const events=new Map();
const payment=()=>({id:"payment",externalReference:"payment",idempotencyKey:"retail:11111111-1111-4111-8111-111111111111:attempt",amount:new Decimal(100),status,orderId:"order",createdAt:new Date("2026-01-01"),order:{id:"order",orderNumber:"IZ-1",items:[],status:orderStatus,userId:"user",paymentStatus:orderStatus==="AWAITING_PAYMENT"?"PENDING":"PAID"}});
beforeEach(()=>{orderStatus="AWAITING_PAYMENT";status="PENDING";otherPaid=false;newerAttempt=false;events.clear();updates.mockClear();orderUpdate.mockClear();history.mockClear();mocks.notify.mockClear();mocks.transaction.mockImplementation(async fn=>fn({$queryRaw:async()=>[],payment:{findUnique:async()=>payment(),findUniqueOrThrow:async()=>payment(),findFirst:async(args:{where:{status:string|{in:string[]}}})=>typeof args.where.status==="string"?(otherPaid?{id:"paid-payment"}:null):(newerAttempt?{id:"newer-payment"}:null),update:async(args:{data:{status:string}})=>{updates(args);status=args.data.status;}},gatewayEvent:{findUnique:async()=>events.get("event"),create:async(args:{data:unknown})=>{events.set("event",args.data);}},order:{update:async(args:{data:{status:string}})=>{orderUpdate(args);orderStatus=args.data.status;}},cart:{updateMany:async()=>{}},orderStatusHistory:{create:history},deliveryTrackingEvent:{create:async()=>{}},user:{findMany:async()=>[]},notification:{upsert:async()=>{},create:async()=>{},createMany:async()=>{}},auditLog:{create:async()=>{}}}));});
const event={eventId:"event",externalReference:"payment",status:"PAID" as const,amount:"100.00",currency:"ZAR",raw:{providerId:"event"}};
it("records a verified payment once across repeated notifications without claiming settlement",async()=>{expect((await processPaymentEvent("OZOW",event)).duplicate).toBe(false);expect((await processPaymentEvent("OZOW",event)).duplicate).toBe(true);expect(updates).toHaveBeenCalledTimes(1);expect(history).toHaveBeenCalledTimes(1);expect(mocks.notify).toHaveBeenCalledTimes(1);expect(updates.mock.calls[0][0].data).not.toHaveProperty("fundsAvailableAt");});
it("rejects currency and amount tampering before any payment transition",async()=>{await expect(processPaymentEvent("PAYFAST",{...event,amount:"1"})).rejects.toThrow("amount mismatch");await expect(processPaymentEvent("OZOW",{...event,currency:"USD"})).rejects.toThrow("currency mismatch");expect(updates).not.toHaveBeenCalled();});
it("does not let an old failed attempt overwrite a newer active retry",async()=>{newerAttempt=true;const result=await processPaymentEvent("OZOW",{...event,eventId:"failed-event",status:"FAILED"});expect(result.duplicate).toBe(false);expect(updates).toHaveBeenCalledTimes(1);expect(orderUpdate).not.toHaveBeenCalled();});
it("flags a second captured payment without reserving or notifying as a new paid order",async()=>{otherPaid=true;const result=await processPaymentEvent("OZOW",event);expect(result.duplicate).toBe(true);expect(updates).toHaveBeenCalledTimes(1);expect(orderUpdate).not.toHaveBeenCalled();expect(history).not.toHaveBeenCalled();expect(mocks.notify).not.toHaveBeenCalled();});
it("acknowledges a committed payment even when its notification fails",async()=>{mocks.notify.mockRejectedValueOnce(new Error("mail unavailable"));await expect(processPaymentEvent("PAYFAST",event)).resolves.toMatchObject({duplicate:false,paymentId:"payment"});});

it("records a late capture on a closed order for review without restarting fulfilment",async()=>{orderStatus="CANCELLED";await expect(processPaymentEvent("OZOW",event)).resolves.toMatchObject({duplicate:true});expect(updates).toHaveBeenCalledTimes(1);expect(orderUpdate).not.toHaveBeenCalled();expect(history).not.toHaveBeenCalled();expect(mocks.notify).not.toHaveBeenCalled();});

it("repairs a confirmed payment whose order is still awaiting payment when authoritative evidence is replayed",async()=>{
 status="PAID";events.set("event",{paymentId:"payment"});
 await processPaymentEvent("PAYFAST",event);
 expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({paymentStatus:"PAID",status:"PAYMENT_VERIFIED"})}));
});

it("allows a later successful provider status after an earlier failure for the same transaction",async()=>{
 await processPaymentEvent("OZOW",{...event,status:"FAILED"});
 await processPaymentEvent("OZOW",event);
 expect(orderUpdate).toHaveBeenLastCalledWith(expect.objectContaining({data:expect.objectContaining({paymentStatus:"PAID"})}));
});

it("normalizes Ozow test booleans without accepting an invalid value",()=>{
 expect(normalizeOzowBoolean("False")).toBe("false");expect(normalizeOzowBoolean("TRUE")).toBe("true");expect(()=>normalizeOzowBoolean("yes")).toThrow("Invalid Ozow test mode");
});

it("hashes the documented Ozow notification fields with two-decimal amount and raw test casing",()=>{
 const fields={SiteCode:"TST-001",TransactionId:"tx",TransactionReference:"order",Amount:"5",Status:"Complete",Optional1:"",Optional2:"",Optional3:"",Optional4:"",Optional5:"",CurrencyCode:"ZAR",IsTest:"False",StatusMessage:""};
 expect(ozowNotificationHash(fields,"secret")).toBe("970d4d84de11c0ea5adceb994fc6a99353c1caf39060fd165c98dbab30dab771760a5f1d15d51997d5ff3401911757b159d284dbb2b91a2880eb5ff504908882");
});

it("normalizes both current object and historical array Ozow lookup responses",()=>{
 const current={transactionId:"tx",siteCode:"SITE",transactionReference:"payment",currencyCode:"ZAR",amount:5,status:"Complete"};
 const historical={TransactionId:"tx",SiteCode:"SITE",TransactionReference:"payment",CurrencyCode:"ZAR",Amount:5,Status:"Complete"};
 expect(ozowTransactionRows(current)).toEqual([{transactionId:"tx",siteCode:"SITE",transactionReference:"payment",currencyCode:"ZAR",amount:"5",status:"Complete",isTest:undefined}]);
 expect(ozowTransactionRows([historical])).toEqual([{transactionId:"tx",siteCode:"SITE",transactionReference:"payment",currencyCode:"ZAR",amount:"5",status:"Complete",isTest:undefined}]);
});

it("refuses to choose between multiple matching Ozow transactions",()=>{
 const row={transactionId:"tx",siteCode:"SITE",transactionReference:"payment",currencyCode:"ZAR",amount:"5",status:"Complete",isTest:undefined};
 expect(()=>selectVerifiedOzowTransaction([row,{...row,transactionId:"tx-2"}],{siteCode:"SITE",reference:"payment",currencyCode:"ZAR",isTest:"false"})).toThrow(/multiple/i);
});
