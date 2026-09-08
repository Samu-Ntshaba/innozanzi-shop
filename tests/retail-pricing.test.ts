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
