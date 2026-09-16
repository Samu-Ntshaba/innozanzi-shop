import {prisma} from "@/lib/prisma";
import {syncMarketProducts} from "./products";
import {getTradingRules} from "./settings";

export const monthlyPeriodKey=(date=new Date())=>`MONTHLY:${date.toISOString().slice(0,7)}`;
export async function startTradingSession(input:{scanType:"MONTHLY"|"ON_DEMAND";createdById?:string;now?:Date}){
  const now=input.now??new Date(),rules=await getTradingRules();await syncMarketProducts(rules.maxProductsPerSession);
  const periodKey=input.scanType==="MONTHLY"?monthlyPeriodKey(now):`ON_DEMAND:${now.toISOString()}:${crypto.randomUUID()}`;
  const session=await prisma.tradingSession.upsert({where:{periodKey},update:{},create:{periodKey,name:input.scanType==="MONTHLY"?`Monthly market review ${now.toISOString().slice(0,7)}`:"On-demand market review",scanType:input.scanType,rulesSnapshot:rules,createdById:input.createdById}});
  const products=await prisma.marketProduct.findMany({orderBy:{key:"asc"},take:rules.maxProductsPerSession});
  await prisma.marketScanJob.createMany({data:products.map(product=>({sessionId:session.id,productKey:product.key,snapshot:{name:product.name,brand:product.brand,mpn:product.mpn,gtin:product.gtin,variant:product.variant}})),skipDuplicates:true});
  return session;
}
