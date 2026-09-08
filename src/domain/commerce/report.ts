import Decimal from "decimal.js";
import { z } from "zod";
const money=z.string().regex(/^-?\d+(\.\d+)?$/);
const schema=z.object({expectedUnitEconomics:z.object({gross:money,landed:money,fees:money,reserve:money,contribution:money})});
export function summarizeSavedEconomics(items:Array<{quantity:number;sourceSnapshot:unknown}>){
 let revenue=new Decimal(0),landed=new Decimal(0),fees=new Decimal(0),reserve=new Decimal(0),contribution=new Decimal(0);
 if(!items.length)return null;
 for(const item of items){const parsed=schema.safeParse(item.sourceSnapshot);if(!parsed.success)return null;const e=parsed.data.expectedUnitEconomics;revenue=revenue.plus(new Decimal(e.gross).mul(item.quantity));landed=landed.plus(new Decimal(e.landed).mul(item.quantity));fees=fees.plus(new Decimal(e.fees).mul(item.quantity));reserve=reserve.plus(new Decimal(e.reserve).mul(item.quantity));contribution=contribution.plus(new Decimal(e.contribution).mul(item.quantity));}
 return {revenue,landed,fees,reserve,contribution};
}
