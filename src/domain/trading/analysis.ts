import Decimal from "decimal.js";
import {z} from "zod";
import type {TradingRules} from "./config";

export const marketIdentitySchema=z.object({name:z.string(),brand:z.string().nullable(),mpn:z.string().nullable(),gtin:z.string().nullable(),variant:z.record(z.string(),z.string())});
export type MarketIdentity=z.infer<typeof marketIdentitySchema>;
export const observationSchema=z.object({retailer:z.string().min(1).max(160),sourceUrl:z.string().url().max(2000),country:z.literal("ZA"),currency:z.literal("ZAR"),advertisedPrice:z.number().positive().max(10000000),regularPrice:z.number().positive().max(10000000).nullable(),promotionPrice:z.number().positive().max(10000000).nullable(),promotionDetected:z.boolean(),promotionType:z.string().max(100).nullable(),stockState:z.enum(["IN_STOCK","OUT_OF_STOCK","UNKNOWN"]),condition:z.enum(["NEW","USED","REFURBISHED","UNKNOWN"]),brand:z.string().nullable(),mpn:z.string().nullable(),gtin:z.string().nullable(),variant:z.record(z.string(),z.string()),matchExplanation:z.string().max(500)});
export type Observation=z.infer<typeof observationSchema>;
const norm=(value:string|null|undefined)=>(value??"").normalize("NFKC").trim().toUpperCase().replace(/\s+/g,"");
export function exactMarketMatch(identity:MarketIdentity,observation:Observation){
  if(observation.condition!=="NEW"||observation.stockState!=="IN_STOCK")return false;
  const gtin=Boolean(identity.gtin&&observation.gtin&&norm(identity.gtin).padStart(14,"0")===norm(observation.gtin).padStart(14,"0"));
  const mpn=Boolean(identity.brand&&identity.mpn&&norm(identity.brand)===norm(observation.brand)&&norm(identity.mpn)===norm(observation.mpn));
  if(!gtin&&!mpn)return false;
  for(const [key,value] of Object.entries(identity.variant))if(observation.variant[key]&&norm(value)!==norm(observation.variant[key]))return false;
  return true;
}
export function validateObservation(raw:unknown,identity:MarketIdentity,citedUrls:Set<string>){
  const parsed=observationSchema.safeParse(raw);if(!parsed.success)return null;
  const row=parsed.data,url=new URL(row.sourceUrl);
  if(url.protocol!=="https:"||url.username||url.password||!citedUrls.has(row.sourceUrl)||!exactMarketMatch(identity,row))return null;
  const host=url.hostname.toLowerCase();
  if(host==="localhost"||/^[\d.:]+$/.test(host)||host.endsWith(".local")||host.includes("innozanzi")||/(^|\.)(ebay|aliexpress|amazon)\./.test(host))return null;
  if(row.promotionDetected&&row.regularPrice!==null&&row.promotionPrice!==null&&row.promotionPrice>=row.regularPrice)return null;
  return row;
}
export function marketBenchmark(observations:Observation[],minimumRetailers:number){
  const retailers=new Map<string,Observation>();for(const row of observations){const domain=new URL(row.sourceUrl).hostname.replace(/^www\./,"");if(!retailers.has(domain))retailers.set(domain,row);}
  const rows=[...retailers.values()],normal=rows.filter(row=>!row.promotionDetected).map(row=>new Decimal(row.advertisedPrice)).sort((a,b)=>a.cmp(b)),promos=rows.filter(row=>row.promotionDetected).map(row=>new Decimal(row.promotionPrice??row.advertisedPrice));
  const median=normal.length?(normal.length%2?normal[Math.floor(normal.length/2)]:normal[normal.length/2-1].plus(normal[normal.length/2]).div(2)):null;
  const confidence=normal.length>=minimumRetailers?"HIGH":normal.length>=2?"MEDIUM":"LOW";
  return {normalLow:normal[0]?.toFixed(2)??null,normalMedian:median?.toFixed(2)??null,normalAverage:normal.length?normal.reduce((sum,p)=>sum.plus(p),new Decimal(0)).div(normal.length).toFixed(2):null,normalHigh:normal.at(-1)?.toFixed(2)??null,promotionLow:promos.length?Decimal.min(...promos).toFixed(2):null,sampleSize:normal.length,confidence,explanation:`${normal.length} independent in-stock retailers with exact identifiers and non-promotional new-product prices. ${promos.length} promotional observations kept separate. Confidence describes evidence coverage, not a model probability.`};
}
export type Benchmark=ReturnType<typeof marketBenchmark>;
export function tradingPosition(input:{effectivePrice:Decimal.Value;floor:Decimal.Value;benchmark:Benchmark|null;rules:TradingRules}){
  const price=new Decimal(input.effectivePrice),floor=new Decimal(input.floor),b=input.benchmark,signals:string[]=[];if(price.lt(floor))signals.push("MARGIN_RISK");
  if(!b)return {status:signals[0]??"UNSCANNED",signals:[...signals,"UNSCANNED"],difference:null,differencePercent:null,recommendedPrice:null,reason:"No current market benchmark is available."};
  if(b.confidence!=="HIGH"||!b.normalMedian)signals.push("LOW_CONFIDENCE");const median=b.normalMedian?new Decimal(b.normalMedian):null,difference=median?price.minus(median):null,percent=median?price.minus(median).div(median).mul(100):null;
  if(b.promotionLow&&median&&new Decimal(b.promotionLow).lt(median.mul(1-input.rules.promotionOutlierPercent/100)))signals.push("PROMOTION_DISTORTION");
  if(percent&&b.confidence==="HIGH"){if(percent.gt(input.rules.aboveMarketPercent))signals.push("ABOVE_MARKET");if(percent.lt(-input.rules.underpricedPercent))signals.push("UNDERPRICED","PROFIT_OPPORTUNITY");}
  if(!signals.length)signals.push("HEALTHY");const recommendation=input.rules.smartMode!=="OFF"&&b.confidence==="HIGH"&&median&&median.gte(floor)?median.toFixed(2):null;
  return {status:signals[0],signals,difference:difference?.toFixed(2)??null,differencePercent:percent?.toFixed(2)??null,recommendedPrice:recommendation,reason:recommendation?"The normal market median preserves the commercial floor and balances market position with contribution. Temporary promotions are excluded.":"Keep the current price pending review: evidence or commercial requirements do not support an automatic recommendation."};
}
