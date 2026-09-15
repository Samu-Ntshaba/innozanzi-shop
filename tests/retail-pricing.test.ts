import { describe,expect,it,vi } from "vitest";
import { DEFAULT_COMMERCE } from "@/domain/commerce/config";
vi.mock("@/domain/commerce/settings",()=>({getCommerceSettings:async()=>DEFAULT_COMMERCE}));
import { supplierRetailPrice } from "@/domain/catalogue/retail-pricing";
import { protectedPrice } from "@/domain/commerce/engine";
describe("protected supplier pricing",()=>{
 it("accounts for unrecoverable VAT, delivery and contribution",()=>{const p=protectedPrice(800);expect(p.vat.toNumber()).toBe(0);expect(p.landed.toNumber()).toBe(1035);expect(p.margin.gte(18)).toBe(true);expect(p.contribution.gte(120)).toBe(true);});
 it("matches the registered-VAT blueprint example",()=>{const p=protectedPrice(800,{...DEFAULT_COMMERCE,vatRegistered:true});expect(p.gross.toNumber()).toBeCloseTo(1350.30,1);expect(p.vat.gt(0)).toBe(true);});
 it("preserves the minimum rand contribution on tiny products and minimum gateway fees",()=>{const p=protectedPrice(1,{...DEFAULT_COMMERCE,supplierDelivery:0},"OZOW");expect(p.contribution.gte(120)).toBe(true);expect(p.fees.gte(1.15)).toBe(true);});
 it("keeps promotions above their current protected floor",async()=>{const p=await supplierRetailPrice({costPrice:800,recommendedRetail:2000,promotionalPrice:700});expect(p.salePrice?.gte(p.minimumPrice)).toBe(true);expect(p.promotionActive).toBe(true);});
 it("ignores expired or invalid supplier promotions",async()=>{for(const data of [{promotionalPrice:900},{promotionalPrice:-1},{promotionalPrice:700,promotionEndsAt:new Date(0)}]){const p=await supplierRetailPrice({costPrice:800,...data});expect(p.salePrice).toBeNull();expect(p.promotionActive).toBe(false);}});
 it("rechecks protection after all supported upward rounding modes",()=>{for(const rounding of["CENT","RAND","99"] as const){const p=protectedPrice(5000,{...DEFAULT_COMMERCE,rounding});expect(p.margin.gte(12)).toBe(true);expect(p.contribution.gte(350)).toBe(true);}});
 it("fails closed on impossible economics",()=>expect(()=>protectedPrice(800,{...DEFAULT_COMMERCE,payfastPercent:50,reservePercent:40,accessoryMargin:30})).toThrow());
});

import { contributionAtPrice } from "@/domain/commerce/engine";
it("reproduces protected contribution and tracks higher selling prices and the selected gateway",()=>{for(const gateway of["OZOW","PAYFAST"] as const){const floor=protectedPrice(800,DEFAULT_COMMERCE,gateway);const actual=contributionAtPrice(800,floor.gross,DEFAULT_COMMERCE,gateway);expect(Number(actual.contribution)).toBeCloseTo(floor.contribution.toNumber(),8);const higher=contributionAtPrice(800,floor.gross.plus(100),DEFAULT_COMMERCE,gateway);expect(Number(higher.contribution)).toBeGreaterThan(Number(actual.contribution));}});

import { commerceSchema } from "@/domain/commerce/config";
import { innozanziPrice } from "@/domain/commerce/engine";
it("uses one Innozanzi price regardless of missing, higher or lower supplier RRP",async()=>{
 const expected=innozanziPrice(4000,DEFAULT_COMMERCE).gross;
 for(const recommendedRetail of [null,1,5299,99999])expect((await supplierRetailPrice({costPrice:4000,recommendedRetail})).regularPrice.equals(expected)).toBe(true);
});
it("allocates monthly costs only by the declared expected unit volume",()=>{
 const settings=commerceSchema.parse({...DEFAULT_COMMERCE,overheadAllocation:"PER_UNIT",platformMonthly:1000,expectedMonthlyUnits:100,customCosts:[{name:"Email",basis:"MONTHLY",amount:500},{name:"Packaging",basis:"PER_ORDER",amount:7}]});
 const p=protectedPrice(800,settings);
 expect(p.operating.toNumber()).toBe(15);expect(p.otherCosts.toNumber()).toBe(7);
 expect(p.contribution.gte(120)).toBe(true);expect(p.margin.gte(18)).toBe(true);
 expect(protectedPrice(800).operating.toNumber()).toBe(0);
});
it("solves custom percentage costs with fixed and minimum gateway fees across VAT and rounding modes",()=>{
 for(const vatRegistered of [false,true])for(const rounding of ["CENT","RAND","99"] as const)for(const gateway of ["OZOW","PAYFAST"] as const)for(const cost of [1,800,5000,100000]){
 const settings=commerceSchema.parse({...DEFAULT_COMMERCE,vatRegistered,rounding,payfastMinimum:300,ozowMinimum:200,payoutAllocation:5,customCosts:[{name:"Risk service",basis:"PERCENT_NET",amount:3},{name:"Inactive",basis:"PER_ITEM",amount:100000,active:false}]});
 const p=protectedPrice(cost,settings),actual=contributionAtPrice(cost,p.gross,settings,p.gateway);
 expect(p.margin.gte(settings[`${p.band}Margin`])).toBe(true);expect(p.contribution.gte(settings[`${p.band}Minimum`])).toBe(true);
 expect(Number(actual.contribution)).toBeCloseTo(p.contribution.toNumber(),7);
 const selected=protectedPrice(cost,settings,gateway);expect(selected.margin.gte(settings[`${selected.band}Margin`])).toBe(true);
 }
});
it("never lets competitive adjustment or rounding cross the floor",()=>{
 for(const competitiveAdjustment of [-50,-2,0,5])for(const rounding of ["CENT","RAND","99"] as const){
 const p=innozanziPrice(5000,{...DEFAULT_COMMERCE,competitiveAdjustment,rounding});expect(p.gross.gte(p.floor.gross)).toBe(true);
 }
});
it("rejects invalid cost and impossible custom fee models",()=>{
 for(const cost of [0,-1,NaN,Infinity])expect(()=>protectedPrice(cost)).toThrow();
 expect(()=>protectedPrice(800,commerceSchema.parse({...DEFAULT_COMMERCE,customCosts:[{name:"Impossible",basis:"PERCENT_NET",amount:100}]}))).toThrow();
});
it("honours one captured pricing policy when publication changes the global policy",async()=>{
 const captured={...DEFAULT_COMMERCE,competitiveAdjustment:20};
 const price=await supplierRetailPrice({costPrice:800},captured);
 expect(price.regularPrice.toString()).toBe(innozanziPrice(800,captured).gross.toString());
});
