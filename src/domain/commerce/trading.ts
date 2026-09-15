import Decimal from "decimal.js";
import {z} from "zod";

export type TradingSale={sourceKey:string;quantity:number;gross:string;vat:string;unitPrice:string;snapshot:unknown;orderedAt:Date;paymentStatus:string;isTestData:boolean};
const economics=z.object({expectedUnitEconomics:z.object({gross:z.string(),contribution:z.string()})});
export type TradingSummary={units:number;previousUnits:number;unitsChange:number;revenue:string;previousRevenue:string;knownContribution:string;expectedContribution:string|null;margin:string|null;unknownLines:number};

export function summarizeTrading(sales:TradingSale[],period:{previous:Date;start:Date;end:Date}){
  const values=new Map<string,{units:number;previousUnits:number;revenue:Decimal;previousRevenue:Decimal;contribution:Decimal;unknownLines:number}>();
  for(const sale of sales){
    if(sale.isTestData||sale.paymentStatus!=="PAID"||sale.orderedAt<period.previous||sale.orderedAt>=period.end)continue;
    const value=values.get(sale.sourceKey)??{units:0,previousUnits:0,revenue:new Decimal(0),previousRevenue:new Decimal(0),contribution:new Decimal(0),unknownLines:0};
    const revenue=new Decimal(sale.gross).minus(sale.vat);
    if(sale.orderedAt<period.start){value.previousUnits+=sale.quantity;value.previousRevenue=value.previousRevenue.plus(revenue);}
    else{
      value.units+=sale.quantity;value.revenue=value.revenue.plus(revenue);
      const parsed=economics.safeParse(sale.snapshot);
      try{
        if(!parsed.success||!new Decimal(parsed.data.expectedUnitEconomics.gross).equals(sale.unitPrice))throw new Error("Missing exact sale snapshot");
        const contribution=new Decimal(parsed.data.expectedUnitEconomics.contribution);
        if(!contribution.isFinite())throw new Error("Invalid contribution");
        value.contribution=value.contribution.plus(contribution.mul(sale.quantity));
      }catch{value.unknownLines++;}
    }
    values.set(sale.sourceKey,value);
  }
  return new Map<string,TradingSummary>([...values].map(([key,v])=>[key,{units:v.units,previousUnits:v.previousUnits,unitsChange:v.units-v.previousUnits,revenue:v.revenue.toFixed(2),previousRevenue:v.previousRevenue.toFixed(2),knownContribution:v.contribution.toFixed(2),expectedContribution:v.unknownLines?null:v.contribution.toFixed(2),margin:v.unknownLines||v.revenue.lte(0)?null:v.contribution.div(v.revenue).mul(100).toFixed(2),unknownLines:v.unknownLines}]));
}
