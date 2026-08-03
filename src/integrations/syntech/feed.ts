import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isFullSyntechProduct, parseFeedDate, parseSyntechFeed, stringAttribute, type SyntechFeedProduct } from "./parser";

export type SyncMode="FULL"|"INCREMENTAL";
export interface SupplierFeedAdapter { provider:string; fetch(mode:SyncMode):Promise<string>; }
const slugify=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,150);
const urlFor=(mode:SyncMode)=>mode==="FULL"?process.env.SYNTECH_FULL_FEED_URL:process.env.SYNTECH_UPDATE_FEED_URL;
export class SyntechJsonAdapter implements SupplierFeedAdapter{
  provider="SYNTECH";
  async fetch(mode:SyncMode){const url=urlFor(mode);if(!url)throw new Error(`${mode==="FULL"?"SYNTECH_FULL_FEED_URL":"SYNTECH_UPDATE_FEED_URL"} is not configured`);const response=await fetch(url,{cache:"no-store",headers:{"user-agent":"Innozanzi-Supplier-Sync/2.0"},signal:AbortSignal.timeout(120_000)});if(!response.ok)throw new Error(`Syntech ${mode.toLowerCase()} feed returned HTTP ${response.status}`);return response.text()}
}
const numberOrNull=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value:null;
function catalogueData(row:SyntechFeedProduct,feedId:string,supplierId:string,now:Date){
  const attrs=row.attributes;const stock=Math.max(0,(row.cptstock??0)+(row.jhbstock??0)+(row.dbnstock??0));
  const images=[row.featured_image,...(row.additional_images??[])].filter((x):x is string=>Boolean(x));
  const promo=typeof row.promo_price==="number"?row.promo_price:null;
  return {feedId,supplierId,supplierProductId:row.sku,supplierSku:row.sku,manufacturerSku:stringAttribute(attrs,"manufacturer-part-number","model-number"),name:row.name!,slug:`${slugify(row.name!)}-${createHash("sha1").update(row.sku).digest("hex").slice(0,10)}`,brand:stringAttribute(attrs,"brand"),category:row.categoriesalt?.split("|")[0]??null,categoryPath:row.categorytreealt??row.categorytree??null,description:row.description??null,shortDescription:row.shortdesc??null,specifications:JSON.parse(JSON.stringify(attrs??{})),images,supplierUrl:row.url??null,stock,stockByLocation:{capeTown:row.cptstock??0,johannesburg:row.jhbstock??0,durban:row.dbnstock??0},availability:stock>0?"IN_STOCK":row.nextshipmenteta?"INCOMING":"CHECK_AVAILABILITY",costPrice:numberOrNull(row.price),recommendedRetail:numberOrNull(row.rrp_incl),promotionalPrice:promo,promotionStartsAt:parseFeedDate(row.promo_starts),promotionEndsAt:parseFeedDate(row.promo_ends),currency:"ZAR",weightGrams:numberOrNull(row.weight),lengthCm:numberOrNull(row.length),widthCm:numberOrNull(row.width),heightCm:numberOrNull(row.height),warranty:stringAttribute(attrs,"warranty"),barcode:stringAttribute(attrs,"ean","ean-barcode","upc"),nextShipmentAt:parseFeedDate(row.nextshipmenteta),sourceUpdatedAt:parseFeedDate(row.last_modified),lastSeenAt:now,active:true,raw:JSON.parse(JSON.stringify(row))};
}
export async function ensureSyntechFeed(){
  const supplierId=process.env.SYNTECH_SUPPLIER_ID;if(!supplierId||supplierId.startsWith("00000000-"))throw new Error("SYNTECH_SUPPLIER_ID must be configured with a generated UUID");
  const supplier=await prisma.supplier.upsert({where:{id:supplierId},update:{companyName:"Syntech Distribution",website:"https://www.syntech.co.za",isActive:true},create:{id:supplierId,companyName:"Syntech Distribution",website:"https://www.syntech.co.za",isActive:true}});
  return prisma.supplierFeed.upsert({where:{supplierId_provider:{supplierId:supplier.id,provider:"SYNTECH"}},update:{adapter:"SYNTECH_JSON",fullFeedUrl:"ENV:SYNTECH_FULL_FEED_URL",updateFeedUrl:"ENV:SYNTECH_UPDATE_FEED_URL",enabled:true},create:{supplierId:supplier.id,provider:"SYNTECH",adapter:"SYNTECH_JSON",fullFeedUrl:"ENV:SYNTECH_FULL_FEED_URL",updateFeedUrl:"ENV:SYNTECH_UPDATE_FEED_URL",nextSyncAt:new Date()},include:{supplier:true}})
}
export async function syncSyntechFeed(mode:SyncMode,actorId?:string){
  const feed=await ensureSyntechFeed();const run=await prisma.supplierSyncRun.create({data:{feedId:feed.id,supplierId:feed.supplierId,mode,status:"RUNNING",triggeredById:actorId}});const now=new Date();
  try{const parsed=parseSyntechFeed(await new SyntechJsonAdapter().fetch(mode));let added=0,updated=0,skipped=0;
    for(const row of parsed.syntechstock.products){
      if(mode==="INCREMENTAL"&&!isFullSyntechProduct(row)){const found=await prisma.supplierCatalogueProduct.findUnique({where:{feedId_supplierProductId:{feedId:feed.id,supplierProductId:row.sku}}});if(!found){skipped++;continue}await prisma.supplierCatalogueProduct.update({where:{id:found.id},data:{stock:Math.max(0,(row.cptstock??0)+(row.jhbstock??0)+(row.dbnstock??0)),stockByLocation:{capeTown:row.cptstock??0,johannesburg:row.jhbstock??0,durban:row.dbnstock??0},availability:(row.cptstock??0)+(row.jhbstock??0)+(row.dbnstock??0)>0?"IN_STOCK":row.nextshipmenteta?"INCOMING":"CHECK_AVAILABILITY",costPrice:numberOrNull(row.price),recommendedRetail:numberOrNull(row.rrp_incl),promotionalPrice:typeof row.promo_price==="number"?row.promo_price:null,promotionStartsAt:parseFeedDate(row.promo_starts),promotionEndsAt:parseFeedDate(row.promo_ends),nextShipmentAt:parseFeedDate(row.nextshipmenteta),sourceUpdatedAt:parseFeedDate(row.last_modified),lastSeenAt:now,active:true}});updated++;continue}
      const data=catalogueData(row,feed.id,feed.supplierId,now);const found=await prisma.supplierCatalogueProduct.findUnique({where:{feedId_supplierProductId:{feedId:feed.id,supplierProductId:row.sku}},select:{id:true}});await prisma.supplierCatalogueProduct.upsert({where:{feedId_supplierProductId:{feedId:feed.id,supplierProductId:row.sku}},update:data,create:data});if(found)updated++;else added++;
    }
    const removed=mode==="FULL"?(await prisma.supplierCatalogueProduct.updateMany({where:{feedId:feed.id,active:true,lastSeenAt:{lt:now}},data:{active:false,availability:"DISCONTINUED"}})).count:0;const next=new Date(Date.now()+feed.scheduleMinutes*60_000);
    await prisma.$transaction([prisma.supplierSyncRun.update({where:{id:run.id},data:{status:"SUCCEEDED",finishedAt:new Date(),recordsReceived:parsed.syntechstock.products.length,recordsAdded:added,recordsUpdated:updated,recordsRemoved:removed,recordsSkipped:skipped,diagnostics:{currency:parsed.syntechstock.currency,declaredCount:parsed.syntechstock.count}}}),prisma.supplierFeed.update({where:{id:feed.id},data:{lastSuccessAt:new Date(),lastError:null,nextSyncAt:next,...(mode==="FULL"?{lastFullSyncAt:new Date()}:{lastIncrementalSyncAt:new Date()})}})]);return{runId:run.id,total:parsed.syntechstock.products.length,added,updated,removed,skipped};
  }catch(error){const message=error instanceof Error?error.message:String(error);await prisma.$transaction([prisma.supplierSyncRun.update({where:{id:run.id},data:{status:"FAILED",finishedAt:new Date(),error:message}}),prisma.supplierFeed.update({where:{id:feed.id},data:{lastError:message,nextSyncAt:new Date(Date.now()+15*60_000)}})]);throw error}
}
