import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { getAuthContext } from "@/domain/auth/session";
import { getPcBuilderSteps, type PcBuilderProduct } from "@/domain/catalogue/pc-builder";
import { isDailySpecial, supplierRetailPrice } from "@/domain/catalogue/retail-pricing";
import { pcPartCompatibility, type CompatibilitySelection } from "@/domain/pc-projects/compatibility";
import { getOpenAIClient } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { estimateAIRequestCost as calculateCost, explicitBudget, isExplicitBuildRequest, isShoppingRequest, shoppingTarget, targetLabel, type ShoppingTarget } from "./rules";

export { isShoppingRequest } from "./rules";

export const AI_ORIGIN="AI_SHOPPING_ASSISTANT";
const DAY=86_400_000;
const sessionCookie="innozanzi-ai";
const intentSchema=z.object({kind:z.enum(["PRODUCT","PC_BUILD"]),query:z.string().max(100),category:z.string().max(100),brand:z.string().max(80),maxBudget:z.number().nonnegative().max(100_000_000),useCase:z.string().max(120),requirements:z.array(z.string().max(80)).max(8)});
const choiceSchema=z.object({bestId:z.string(),alternativeIds:z.array(z.string()).max(2),reason:z.string().min(10).max(280)});
export type ShoppingIntent=z.infer<typeof intentSchema>;
export type AIProduct={id:string;name:string;slug:string;sku:string;brand:string|null;category:string;categoryPath:string;image:string|null;price:number;stock:number;specifications:Record<string,string>;reason?:string};
export type AIShoppingResult={recommendationId:string;kind:"PRODUCT"|"PC_BUILD";headline:string;reason:string;products:AIProduct[];total:number;builderUrl?:string};

const clean=(value:unknown)=>typeof value==="string"?value.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim():"";
const record=(value:unknown):Record<string,string>=>value&&typeof value==="object"&&!Array.isArray(value)?Object.fromEntries(Object.entries(value as Record<string,unknown>).slice(0,30).map(([key,item])=>[key,clean(typeof item==="object"?JSON.stringify(item):String(item)).slice(0,160)])):{};
const model=()=>process.env.OPENAI_SHOPPING_MODEL??process.env.OPENAI_MODEL??"gpt-5.6-luna";
const numberEnv=(key:string,fallback:number)=>{const value=Number(process.env[key]);return Number.isFinite(value)&&value>=0?value:fallback};
export const estimateAIRequestCost=(input:number,output:number,inputRate=numberEnv("AI_INPUT_COST_PER_MILLION",0.25),outputRate=numberEnv("AI_OUTPUT_COST_PER_MILLION",2))=>calculateCost(input,output,inputRate,outputRate);

export async function aiIdentity(){
  const auth=await getAuthContext(),jar=await cookies();let anonymousSessionId=jar.get(sessionCookie)?.value;
  if(!auth&&!anonymousSessionId){anonymousSessionId=randomUUID();jar.set(sessionCookie,anonymousSessionId,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:180*24*60*60})}
  return{auth,userId:auth?.user.id,anonymousSessionId:auth?undefined:anonymousSessionId};
}

export async function assistantSettings(){
  const rows=await prisma.marketingSetting.findMany({where:{key:{in:["ai.shopping.enabled","ai.dailyWarning","ai.monthlyWarning","ai.tokenWarning"]}}});const values=new Map(rows.map(row=>[row.key,row.value]));
  return{enabled:values.get("ai.shopping.enabled")!==false,dailyWarning:Number(values.get("ai.dailyWarning")??25),monthlyWarning:Number(values.get("ai.monthlyWarning")??500),tokenWarning:Number(values.get("ai.tokenWarning")??4000)};
}

export async function assertUsageAllowed(userId?:string,anonymousSessionId?:string){
  const max=userId?numberEnv("AI_USER_DAILY_LIMIT",5):numberEnv("AI_ANONYMOUS_DAILY_LIMIT",1),since=new Date(Date.now()-DAY);
  const count=await prisma.aIUsage.count({where:{createdAt:{gte:since},requestStatus:"SUCCESS",...(userId?{userId}:{anonymousSessionId})}});
  return{allowed:count<max,remaining:Math.max(0,max-count),limit:max};
}

async function understand(input:string){
  const response=await getOpenAIClient().responses.create({model:model(),store:false,max_output_tokens:250,instructions:"Convert a technology shopping request into compact search criteria. Use empty strings and 0 when unspecified. PC_BUILD means a request for a custom set of PC components; otherwise PRODUCT. Do not answer the request.",input,text:{format:{type:"json_schema",name:"shopping_intent",strict:true,schema:{type:"object",additionalProperties:false,properties:{kind:{type:"string",enum:["PRODUCT","PC_BUILD"]},query:{type:"string",maxLength:100},category:{type:"string",maxLength:100},brand:{type:"string",maxLength:80},maxBudget:{type:"number",minimum:0},useCase:{type:"string",maxLength:120},requirements:{type:"array",maxItems:8,items:{type:"string",maxLength:80}}},required:["kind","query","category","brand","maxBudget","useCase","requirements"]}}}},{timeout:25_000});
  return{intent:intentSchema.parse(JSON.parse(response.output_text)),usage:response.usage};
}

const strictCatalogueScope=(target:ShoppingTarget)=>{
  const starts=(value:string)=>({categoryPath:{startsWith:value}}),contains=(value:string)=>({categoryPath:{contains:value,mode:"insensitive" as const}});
  const scopes:Record<ShoppingTarget,object>={LAPTOP:starts("Computers/Notebooks/"),LAPTOP_BAG:{AND:[starts("Bags & luggage/"),{OR:[{name:{contains:"laptop",mode:"insensitive" as const}},{name:{contains:"notebook",mode:"insensitive" as const}}]}]},LAPTOP_CHARGER:contains("Notebook chargers"),LAPTOP_STAND:{AND:[contains("Stands and cooling"),{OR:[{name:{contains:"laptop",mode:"insensitive" as const}},{name:{contains:"notebook",mode:"insensitive" as const}}]}]},DESKTOP_PC:{OR:[starts("Computers/Desktop computers/"),starts("Computers/AIO computers")]},COMPUTER:{OR:[starts("Computers/Notebooks/"),starts("Computers/Desktop computers/"),starts("Computers/AIO computers/")]},MONITOR:contains("/Monitors/"),PRINTER:{OR:[contains("Printer"),contains("Printing")]},KEYBOARD:contains("/Keyboards/"),MOUSE:contains("/Mice/"),HEADSET:{OR:[contains("/Headsets/"),contains("/Headphones/")]},ROUTER:contains("Router"),TABLET:starts("Computers/Tablets"),SERVER:{OR:[contains("Server"),contains("Servers")]},CPU:starts("Components/CPU/"),MOTHERBOARD:starts("Components/Motherboards/"),MEMORY:starts("Components/Memory/"),STORAGE:{OR:[starts("Components/Solid state drives/"),starts("Components/Hard disk drives/")]},GRAPHICS_CARD:starts("Components/Graphics cards/"),POWER_SUPPLY:starts("Components/Power supplies/"),PC_CASE:starts("Components/Chassis/"),COOLING:starts("Components/Cooling/"),GENERAL:{}};
  return scopes[target];
};

async function candidates(intent:ShoppingIntent,target:ShoppingTarget):Promise<AIProduct[]>{
  const terms=[intent.query,intent.category,intent.brand,...intent.requirements].flatMap(value=>value.split(/\s+/)).map(value=>value.trim()).filter(value=>value.length>2).slice(0,8);
  const focused=`${intent.category} ${intent.useCase}`.toLowerCase(),generalSearch=terms.length&&target==="GENERAL"?{OR:terms.flatMap(term=>[{name:{contains:term,mode:"insensitive" as const}},{category:{contains:term,mode:"insensitive" as const}},{categoryPath:{contains:term,mode:"insensitive" as const}},{brand:{contains:term,mode:"insensitive" as const}}])}:undefined;
  const rows=await prisma.supplierCatalogueProduct.findMany({where:{active:true,availability:"IN_STOCK",stock:{gt:0},costPrice:{gt:0},images:{isEmpty:false},AND:[strictCatalogueScope(target),...(intent.brand?[{brand:{equals:intent.brand,mode:"insensitive" as const}}]:[]),...(focused.includes("gaming")?[{OR:[{name:{contains:"gaming",mode:"insensitive" as const}},{categoryPath:{contains:"gaming",mode:"insensitive" as const}}]}]:[]),...(generalSearch?[generalSearch]:[])]},orderBy:[{promotionalPrice:"asc"},{sourceUpdatedAt:"desc"}],take:80});
  return rows.map(row=>{const retail=supplierRetailPrice({costPrice:row.costPrice!,recommendedRetail:row.recommendedRetail,promotionalPrice:row.promotionalPrice,promotionStartsAt:row.promotionStartsAt,promotionEndsAt:row.promotionEndsAt,special:isDailySpecial(row.id)}),price=Number(retail.salePrice??retail.regularPrice);return{id:row.id,name:row.name,slug:row.slug,sku:row.supplierSku,brand:row.brand,category:row.category??"Technology",categoryPath:row.categoryPath??"",image:row.images[0]??null,price,stock:row.stock,specifications:record(row.specifications)}}).filter(item=>!intent.maxBudget||item.price<=intent.maxBudget).sort((a,b)=>a.price-b.price).slice(0,15);
}

async function productRecommendation(intent:ShoppingIntent,items:AIProduct[]){
  if(!items.length)throw new Error("NO_MATCHES");
  const evidence=items.map(({id,name,brand,category,price,stock,specifications})=>({id,name,brand,category,price,stock,specifications}));
  const response=await getOpenAIClient().responses.create({model:model(),store:false,max_output_tokens:260,instructions:"Choose the best product only from the supplied candidates. IDs must be copied exactly. Prefer requirements and budget over prestige. The reason must be one short, plain-English, sales-helpful sentence based only on supplied facts.",input:JSON.stringify({intent,candidates:evidence}),text:{format:{type:"json_schema",name:"shopping_choice",strict:true,schema:{type:"object",additionalProperties:false,properties:{bestId:{type:"string"},alternativeIds:{type:"array",maxItems:2,items:{type:"string"}},reason:{type:"string",minLength:10,maxLength:280}},required:["bestId","alternativeIds","reason"]}}}},{timeout:25_000});
  const choice=choiceSchema.parse(JSON.parse(response.output_text)),byId=new Map(items.map(item=>[item.id,item]));if(!byId.has(choice.bestId))throw new Error("INVALID_AI_PRODUCT");
  const selected=[choice.bestId,...choice.alternativeIds].filter((id,index,array)=>array.indexOf(id)===index).map(id=>byId.get(id)).filter((item):item is AIProduct=>Boolean(item)).slice(0,3);
  return{products:selected,reason:choice.reason,usage:response.usage};
}

async function pcBuild(intent:ShoppingIntent){
  const steps=await getPcBuilderSteps(),required=["cpu","motherboard","memory","storage","graphics","power","case"] as const,budget=intent.maxBudget||25000,selections:Record<string,PcBuilderProduct>={};
  for(const key of required){const step=steps.find(item=>item.key===key);if(!step)continue;const options=step.products.filter(item=>pcPartCompatibility(key,item,selections as CompatibilitySelection).kind!=="bad").sort((a,b)=>Number(a.price)-Number(b.price));if(options.length)selections[key]=options[Math.min(options.length-1,key==="graphics"?Math.floor(options.length*.35):Math.floor(options.length*.2))]}
  let chosen=Object.entries(selections);let total=chosen.reduce((sum,[,item])=>sum+Number(item.price),0);if(total>budget){for(const[key]of [...chosen].sort((a,b)=>Number(b[1].price)-Number(a[1].price))){const step=steps.find(item=>item.key===key);const replacement=step?.products.filter(item=>Number(item.price)<Number(selections[key].price)&&pcPartCompatibility(key,item,Object.fromEntries(Object.entries(selections).filter(([other])=>other!==key)) as CompatibilitySelection).kind!=="bad").sort((a,b)=>Number(a.price)-Number(b.price))[0];if(replacement){selections[key]=replacement;total=Object.values(selections).reduce((sum,item)=>sum+Number(item.price),0)}if(total<=budget)break}chosen=Object.entries(selections)}
  if(chosen.length<6||(intent.maxBudget>0&&total>budget))throw new Error("NO_BUILD");const products=chosen.map(([key,item])=>({...item,price:Number(item.price),category:steps.find(step=>step.key===key)?.shortTitle??key,reason:key}));
  const response=await getOpenAIClient().responses.create({model:model(),store:false,max_output_tokens:120,instructions:"Write one short, plain-English sentence explaining why this available PC build fits the stated use and budget. Do not invent specifications or promise performance.",input:JSON.stringify({intent,total,parts:products.map(item=>({name:item.name,category:item.category,price:item.price,specifications:item.specifications}))})},{timeout:25_000});
  return{products,reason:response.output_text.trim().slice(0,280)||"A balanced starting point using currently available, compatibility-checked components.",total,usage:response.usage};
}

export async function recommend(input:string,source?:string):Promise<AIShoppingResult>{
  const started=Date.now(),identity=await aiIdentity(),settings=await assistantSettings();if(!settings.enabled)throw new Error("DISABLED");if(!isShoppingRequest(input))throw new Error("OUT_OF_SCOPE");const allowance=await assertUsageAllowed(identity.userId,identity.anonymousSessionId);if(!allowance.allowed)throw new Error("RATE_LIMIT");
  const recommendationId=createHash("sha256").update(`${identity.userId??identity.anonymousSessionId}:${Date.now()}:${input}`).digest("hex").slice(0,32);let usage={input_tokens:0,output_tokens:0,total_tokens:0},intent:ShoppingIntent|undefined;
  try{const parsed=await understand(input),target=shoppingTarget(input),explicitBuild=isExplicitBuildRequest(input),budget=explicitBudget(input);intent={...parsed.intent,kind:explicitBuild?"PC_BUILD":"PRODUCT",maxBudget:budget??parsed.intent.maxBudget};usage=parsed.usage??usage;const result=intent.kind==="PC_BUILD"?await pcBuild(intent):await productRecommendation(intent,await candidates(intent,target));usage={input_tokens:usage.input_tokens+(result.usage?.input_tokens??0),output_tokens:usage.output_tokens+(result.usage?.output_tokens??0),total_tokens:usage.total_tokens+(result.usage?.total_tokens??0)};const total="total" in result&&typeof result.total==="number"?result.total:Number(result.products[0]?.price??0);
    await prisma.aIUsage.create({data:{userId:identity.userId,anonymousSessionId:identity.anonymousSessionId,recommendationId,model:model(),intentType:intent.kind,inputTokens:usage.input_tokens,outputTokens:usage.output_tokens,totalTokens:usage.total_tokens,estimatedCost:estimateAIRequestCost(usage.input_tokens,usage.output_tokens),requestStatus:"SUCCESS",responseTimeMs:Date.now()-started,pcBuildGenerated:intent.kind==="PC_BUILD",metadata:{source,category:intent.category,useCase:intent.useCase,budget:intent.maxBudget,candidateCount:result.products.length,recommendedProductIds:result.products.map(item=>item.id)}}});
    return{recommendationId,kind:intent.kind,headline:intent.kind==="PC_BUILD"?"Your AI PC build":"Best match",reason:result.reason,products:result.products,total,builderUrl:intent.kind==="PC_BUILD"?`/build-a-pc?ai=${recommendationId}`:undefined};
  }catch(error){await prisma.aIUsage.create({data:{userId:identity.userId,anonymousSessionId:identity.anonymousSessionId,recommendationId,model:model(),intentType:intent?.kind,inputTokens:usage.input_tokens,outputTokens:usage.output_tokens,totalTokens:usage.total_tokens,estimatedCost:estimateAIRequestCost(usage.input_tokens,usage.output_tokens),requestStatus:"FAILED",responseTimeMs:Date.now()-started,errorCode:error instanceof Error?error.message.slice(0,80):"UNKNOWN"}}).catch(()=>undefined);if(error instanceof Error&&["NO_MATCHES","NO_BUILD"].includes(error.message)){const target=intent?.kind==="PC_BUILD"?"compatible PC build":targetLabel(shoppingTarget(input)),budget=intent?.maxBudget;throw new Error(`NO_MATCHES|Unfortunately, we couldn't find an in-stock ${target}${budget?` within R${budget.toLocaleString("en-ZA")}`:" matching that request"}. Try a higher budget or browse the catalogue.`)}throw error}
}
