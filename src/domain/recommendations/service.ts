import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getAuthContext } from "@/domain/auth/session";
import { isDailySpecial, supplierRetailPrice } from "@/domain/catalogue/retail-pricing";
import type { ProductCardData } from "@/domain/catalogue/queries";
import { prisma } from "@/lib/prisma";

const weights:Record<string,number>={IMPRESSION:.2,VIEW:1,SEARCH:1.5,GAMING_VISIT:2,BUILD_VISIT:3,PC_COMPONENT_SELECTED:5,CART_ADD:7,CART_REMOVE:-3,WISHLIST_ADD:6,WISHLIST_REMOVE:-3,PURCHASE:12,RECOMMENDATION_CLICK:2,NOT_INTERESTED:-8};
const lower=(value:string|null|undefined)=>value?.trim().toLowerCase()??"";
const add=(map:Map<string,number>,key:string,value:number)=>{if(key)map.set(key,(map.get(key)??0)+value)};

export type Recommendation={product:ProductCardData;reason:string;recommendationId:string};
export async function getRecommendations(input:{limit?:number;category?:string;brand?:string;excludeIds?:string[];context?:string}={}):Promise<Recommendation[]>{
  const auth=await getAuthContext(),sessionId=(await cookies()).get("innozanzi-rec")?.value,limit=input.limit??4;
  const events=auth?.user.id||sessionId?await prisma.recommendationEvent.findMany({where:{createdAt:{gte:new Date(Date.now()-180*86_400_000)},OR:[...(auth?.user.id?[{userId:auth.user.id}]:[]),...(sessionId?[{sessionId}]:[])]},orderBy:{createdAt:"desc"},take:500}):[];
  const categories=new Map<string,number>(),brands=new Map<string,number>(),viewed=new Set<string>(),now=Date.now();
  for(const event of events){const decay=Math.pow(.5,(now-event.createdAt.getTime())/(30*86_400_000)),score=(weights[event.eventType]??.5)*decay;add(categories,lower(event.category),score);add(brands,lower(event.brand),score*.65);if(event.entityId)viewed.add(event.entityId);if(event.eventType==="GAMING_VISIT"){add(categories,"gaming",score);add(categories,"components",score*.7)}if(event.eventType==="BUILD_VISIT"||event.eventType==="PC_COMPONENT_SELECTED")add(categories,"components",score)}
  const rows=await prisma.supplierCatalogueProduct.findMany({where:{active:true,availability:"IN_STOCK",stock:{gt:0},costPrice:{gt:0},images:{isEmpty:false},id:{notIn:input.excludeIds??[]}},orderBy:{sourceUpdatedAt:"desc"},take:160});
  const ranked=rows.map(row=>{const haystack=lower(`${row.category} ${row.categoryPath} ${row.name}`),explicitCategory=lower(input.category),explicitBrand=lower(input.brand);let score=parseInt(createHash("sha1").update(row.id).digest("hex").slice(0,4),16)/262144,reason="Popular and available now";if(explicitCategory&&haystack.includes(explicitCategory)){score+=50;reason=`Related to ${input.category}`}if(explicitBrand&&lower(row.brand)===explicitBrand){score+=35;reason=`More from ${row.brand}`}for(const[key,value]of categories)if(haystack.includes(key)&&value>0){score+=Math.min(24,value*2);if(!explicitCategory)reason=`Matches your interest in ${row.category??key}`}const brandScore=brands.get(lower(row.brand));if(brandScore&&brandScore>0){score+=Math.min(10,brandScore);if(reason.startsWith("Popular"))reason=`A brand you may like`}if(viewed.has(row.id))score-=8;return{row,score,reason}}).sort((a,b)=>b.score-a.score).slice(0,limit);
  return ranked.map(({row,reason})=>{const price=supplierRetailPrice({costPrice:row.costPrice!,recommendedRetail:row.recommendedRetail,promotionalPrice:row.promotionalPrice,promotionStartsAt:row.promotionStartsAt,promotionEndsAt:row.promotionEndsAt,special:isDailySpecial(row.id)}),recommendationId=createHash("sha1").update(`${auth?.user.id??sessionId??"cold"}:${input.context??"general"}:${row.id}`).digest("hex").slice(0,20);return{reason,recommendationId,product:{id:row.id,name:row.name,slug:row.slug,sku:row.supplierSku,stockStatus:"IN_STOCK",brand:row.brand?{name:row.brand,slug:lower(row.brand)}:null,category:{name:row.category??"Catalogue",slug:row.category??"catalogue"},images:row.images.slice(0,1).map(path=>({path,altText:row.name})),regularPrice:price.regularPrice.toString(),salePrice:price.salePrice?.toString()??null,saleStartsAt:null,saleEndsAt:null,source:"supplier"}}});
}
