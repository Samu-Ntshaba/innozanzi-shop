import {describe,expect,it} from "vitest";
import {DEFAULT_TRADING_RULES, tradingRulesSchema} from "@/domain/trading/config";
import {exactMarketMatch,marketBenchmark,tradingPosition,validateObservation} from "@/domain/trading/analysis";

const identity={name:"ThinkPad T14",brand:"Lenovo",mpn:"21HD001GZA",gtin:null,variant:{ram:"16GB",storage:"512GB"}};
const row=(overrides:Record<string,unknown>={})=>({retailer:"Retailer",sourceUrl:"https://retailer.co.za/p/t14",country:"ZA",currency:"ZAR",advertisedPrice:20000,regularPrice:20000,promotionPrice:null,promotionDetected:false,promotionType:null,stockState:"IN_STOCK",condition:"NEW",brand:"Lenovo",mpn:"21HD001GZA",gtin:null,variant:{ram:"16GB",storage:"512GB"},matchExplanation:"Exact brand and MPN",...overrides});

describe("governed market analysis",()=>{
  it("rejects a conflicting variant even with an exact MPN",()=>expect(exactMarketMatch(identity,row({variant:{ram:"8GB",storage:"512GB"}}) as never)).toBe(false));
  it("requires a cited safe URL and exact identity",()=>{
    expect(validateObservation(row(),identity,new Set(["https://retailer.co.za/p/t14"]))).not.toBeNull();
    expect(validateObservation(row(),identity,new Set())).toBeNull();
    expect(validateObservation(row({sourceUrl:"http://localhost/item"}),identity,new Set(["http://localhost/item"]))).toBeNull();
  });
  it("keeps promotions separate and requires independent normal retailers for high confidence",()=>{
    const observations=[row(),row({retailer:"Two",sourceUrl:"https://two.co.za/t14",advertisedPrice:21000}),row({retailer:"Three",sourceUrl:"https://three.co.za/t14",advertisedPrice:22000}),row({retailer:"Promo",sourceUrl:"https://promo.co.za/t14",advertisedPrice:18000,regularPrice:22000,promotionPrice:18000,promotionDetected:true})] as never[];
    const benchmark=marketBenchmark(observations,3);
    expect(benchmark).toMatchObject({normalMedian:"21000.00",promotionLow:"18000.00",sampleSize:3,confidence:"HIGH"});
  });
  it("never recommends below the floor or from low-confidence evidence",()=>{
    const high=marketBenchmark([row(),row({sourceUrl:"https://two.co.za/t14",advertisedPrice:21000}),row({sourceUrl:"https://three.co.za/t14",advertisedPrice:22000})] as never[],3);
    expect(tradingPosition({effectivePrice:23000,floor:21500,benchmark:high,rules:DEFAULT_TRADING_RULES}).recommendedPrice).toBeNull();
    expect(tradingPosition({effectivePrice:23000,floor:19000,benchmark:{...high,confidence:"LOW"},rules:DEFAULT_TRADING_RULES}).recommendedPrice).toBeNull();
  });
  it("refuses AUTO_APPLY even with scopes in the initial release",()=>expect(()=>tradingRulesSchema.parse({...DEFAULT_TRADING_RULES,smartMode:"AUTO_APPLY",autoScopes:[{type:"BRAND",value:"Lenovo",minimum:0,maximum:100000}]})).toThrow());
});
