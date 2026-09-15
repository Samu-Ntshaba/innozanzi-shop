import {expect,it} from "vitest";
import {summarizeTrading,type TradingSale} from "@/domain/commerce/trading";
const sale:TradingSale={sourceKey:"SUPPLIER:p1",quantity:2,gross:"230",vat:"30",unitPrice:"115",snapshot:{expectedUnitEconomics:{gross:"115",contribution:"20"}},orderedAt:new Date("2026-09-10"),paymentStatus:"PAID",isTestData:false};
const start=new Date("2026-09-01"),previous=new Date("2026-08-01"),end=new Date("2026-10-01");
it("counts units and net revenue with complete snapshot contribution",()=>{
 const result=summarizeTrading([sale],{start,previous,end}).get("SUPPLIER:p1")!;
 expect(result.units).toBe(2);expect(result.revenue).toBe("200.00");expect(result.expectedContribution).toBe("40.00");expect(result.margin).toBe("20.00");
});
it("keeps missing or mismatched commercial snapshots unknown instead of inventing profit",()=>{
 for(const snapshot of [null,{expectedUnitEconomics:{gross:"120",contribution:"20"}}]){
  expect(summarizeTrading([{...sale,snapshot}],{start,previous,end}).get("SUPPLIER:p1")?.expectedContribution).toBeNull();
 }
});
it("excludes unpaid, test and refunded orders and respects period boundaries",()=>{
 const rows=[sale,{...sale,quantity:5,orderedAt:new Date("2026-08-10")},{...sale,quantity:99,orderedAt:end},{...sale,isTestData:true},{...sale,paymentStatus:"PARTIALLY_REFUNDED"},{...sale,paymentStatus:"PENDING"}];
 const result=summarizeTrading(rows,{start,previous,end}).get("SUPPLIER:p1")!;
 expect(result.units).toBe(2);expect(result.previousUnits).toBe(5);expect(result.unitsChange).toBe(-3);
});
it("does not claim complete aggregate profit when one line lacks evidence",()=>{
 const result=summarizeTrading([sale,{...sale,snapshot:null}],{start,previous,end}).get("SUPPLIER:p1")!;
 expect(result.expectedContribution).toBeNull();expect(result.knownContribution).toBe("40.00");expect(result.unknownLines).toBe(1);
});
