import Decimal from "decimal.js";
import { z } from "zod";
export const actualCostSchema=z.object({
 supplier:z.coerce.number().finite().min(0).max(100000000),
 delivery:z.coerce.number().finite().min(0).max(100000000),
 gateway:z.coerce.number().finite().min(0).max(100000000),
 other:z.coerce.number().finite().min(0).max(100000000),
});
export function reconciledProfit(gross:Decimal.Value,outputVat:Decimal.Value,costs:z.infer<typeof actualCostSchema>){
 const parsed=actualCostSchema.parse(costs),revenue=new Decimal(gross).minus(outputVat);
 if(!revenue.isFinite()||revenue.lte(0))throw new Error("Positive net revenue is required for reconciliation.");
 const total=Object.values(parsed).reduce((sum,cost)=>sum.plus(cost),new Decimal(0)),profit=revenue.minus(total);
 return {revenue:revenue.toFixed(2),costs:parsed,totalCost:total.toFixed(2),profit:profit.toFixed(2),margin:profit.div(revenue).mul(100).toFixed(2)};
}
