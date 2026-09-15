import { createHash } from "node:crypto";
import { beforeEach,expect,it,vi } from "vitest";
import { DEFAULT_COMMERCE } from "@/domain/commerce/config";
const mocks=vi.hoisted(()=>({transaction:vi.fn(),impact:vi.fn(),lock:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:mocks.transaction}}));
vi.mock("@/domain/commerce/impact",()=>({pricingImpact:mocks.impact}));
import { parsePricingForm,publishPricing } from "@/domain/commerce/publication";
let records:Map<string,unknown>,auditFails=false;
const input={settings:DEFAULT_COMMERCE,actorId:"admin",reason:"Verified merchant fees",impactToken:"preview",confirmed:true};
beforeEach(()=>{
 vi.clearAllMocks();records=new Map([["commerce.pricing.draft",DEFAULT_COMMERCE]]);auditFails=false;
 mocks.impact.mockResolvedValue({token:"preview",baseline:createHash("sha256").update(JSON.stringify(DEFAULT_COMMERCE)).digest("hex")});
 mocks.transaction.mockImplementation(async fn=>{
  const pending=new Map(records);
  const result=await fn({$queryRaw:async(strings:TemplateStringsArray)=>{expect(strings.join("")).toContain("::text AS locked");mocks.lock();return [{locked:""}];},siteSetting:{findUnique:async({where}:{where:{key:string}})=>pending.has(where.key)?{value:pending.get(where.key)}:null,upsert:async({where,create}:{where:{key:string};create:{value:unknown}})=>{pending.set(where.key,create.value);}},auditLog:{create:async()=>{if(auditFails)throw new Error("Audit write failed");}}});
  records=pending;return result;
 });
});
it("publishes the active configuration and version together after confirmed preview",async()=>{
 const result=await publishPricing(input);expect(records.get("commerce.pricing.v1")).toEqual(DEFAULT_COMMERCE);expect(records.get("commerce.pricing.active")).toMatchObject({version:result.version,approvedBy:"admin"});expect(mocks.lock).toHaveBeenCalledOnce();
});
it("rolls back all pricing writes if the audit write fails",async()=>{
 records.set("commerce.pricing.v1",DEFAULT_COMMERCE);records.set("commerce.pricing.active",{version:"old"});records.set("commerce.pricing.draft",{...DEFAULT_COMMERCE,competitiveAdjustment:5});auditFails=true;
 await expect(publishPricing({...input,settings:{...DEFAULT_COMMERCE,competitiveAdjustment:5}})).rejects.toThrow("Audit write failed");
 expect(records.get("commerce.pricing.v1")).toEqual(DEFAULT_COMMERCE);expect(records.get("commerce.pricing.active")).toEqual({version:"old"});
});
it("rejects stale previews and unconfirmed approval before entering a write transaction",async()=>{
 await expect(publishPricing({...input,confirmed:false})).rejects.toThrow("preview");await expect(publishPricing({...input,impactToken:"old"})).rejects.toThrow("preview");expect(mocks.transaction).not.toHaveBeenCalled();
});
it("retains an intervening active version when another administrator already published",async()=>{
 const changed={...DEFAULT_COMMERCE,handling:25};records.set("commerce.pricing.v1",changed);
 await expect(publishPricing(input)).rejects.toThrow("Another administrator");expect(records.get("commerce.pricing.v1")).toEqual(changed);
});
it("parses the actual browser form without requiring supplier RRP and rejects malformed custom costs",()=>{
 const form=new FormData();for(const [key,value] of Object.entries(DEFAULT_COMMERCE))form.set(key,key==="customCosts"?JSON.stringify(value):String(value));
 expect(parsePricingForm(form)).toEqual(DEFAULT_COMMERCE);form.set("customCosts","broken");expect(()=>parsePricingForm(form)).toThrow("invalid data");
});
it("rejects a draft replaced after the action checked it but before publication",async()=>{
 records.set("commerce.pricing.draft",{...DEFAULT_COMMERCE,handling:44});
 await expect(publishPricing(input)).rejects.toThrow("draft");
 expect(records.has("commerce.pricing.active")).toBe(false);
});
