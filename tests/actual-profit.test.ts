import { expect,it } from "vitest";
import { reconciledProfit } from "@/domain/commerce/reconciliation";
it("separates output VAT from actual economic costs and reports losses explicitly",()=>{
 const p=reconciledProfit(1150,150,{supplier:700,delivery:50,gateway:30,other:20});
 expect(p).toMatchObject({revenue:"1000.00",profit:"200.00",margin:"20.00"});
 expect(reconciledProfit(1150,150,{supplier:1100,delivery:0,gateway:0,other:0}).profit).toBe("-100.00");
});
it("rejects invalid actual costs and zero revenue",()=>{
 expect(()=>reconciledProfit(0,0,{supplier:1,delivery:0,gateway:0,other:0})).toThrow();
 expect(()=>reconciledProfit(100,0,{supplier:-1,delivery:0,gateway:0,other:0})).toThrow();
});
