import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isFullSyntechProduct, parseFeedDate, parseSyntechFeed, stringAttribute, type SyntechFeedProduct } from "./parser";

export type SyncMode="FULL"|"INCREMENTAL";
export interface SupplierFeedAdapter { provider:string; fetch(mode:SyncMode):Promise<string>; }
const slugify=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,150);
const decodeText=(value:string)=>value.replaceAll("&amp;","&").replaceAll("&quot;",'"').replaceAll("&#039;", "'").replaceAll("&nbsp;"," ").trim();
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
  const name=decodeText(row.name!);const brand=stringAttribute(attrs,"brand");const category=row.categoriesalt?.split("|")[0];
  return {feedId,supplierId,supplierProductId:row.sku,supplierSku:row.sku,manufacturerSku:stringAttribute(attrs,"manufacturer-part-number","model-number"),name,slug:`${slugify(name)}-${createHash("sha1").update(row.sku).digest("hex").slice(0,10)}`,brand:brand?decodeText(brand):null,category:category?decodeText(category):null,categoryPath:row.categorytreealt?decodeText(row.categorytreealt):row.categorytree?decodeText(row.categorytree):null,description:row.description??null,shortDescription:row.shortdesc??null,specifications:JSON.parse(JSON.stringify(attrs??{})),images,supplierUrl:row.url??null,stock,stockByLocation:{capeTown:row.cptstock??0,johannesburg:row.jhbstock??0,durban:row.dbnstock??0},availability:stock>0?"IN_STOCK":row.nextshipmenteta?"INCOMING":"CHECK_AVAILABILITY",costPrice:numberOrNull(row.price),recommendedRetail:numberOrNull(row.rrp_incl),promotionalPrice:promo,promotionStartsAt:parseFeedDate(row.promo_starts),promotionEndsAt:parseFeedDate(row.promo_ends),currency:"ZAR",weightGrams:numberOrNull(row.weight),lengthCm:numberOrNull(row.length),widthCm:numberOrNull(row.width),heightCm:numberOrNull(row.height),warranty:stringAttribute(attrs,"warranty"),barcode:stringAttribute(attrs,"ean","ean-barcode","upc"),nextShipmentAt:parseFeedDate(row.nextshipmenteta),sourceUpdatedAt:parseFeedDate(row.last_modified),lastSeenAt:now,active:true};
}
export async function ensureSyntechFeed(){
  const supplierId=process.env.SYNTECH_SUPPLIER_ID;if(!supplierId||supplierId.startsWith("00000000-"))throw new Error("SYNTECH_SUPPLIER_ID must be configured with a generated UUID");
  const supplier=await prisma.supplier.upsert({where:{id:supplierId},update:{companyName:"Syntech Distribution",website:"https://www.syntech.co.za",isActive:true},create:{id:supplierId,companyName:"Syntech Distribution",website:"https://www.syntech.co.za",isActive:true}});
  return prisma.supplierFeed.upsert({where:{supplierId_provider:{supplierId:supplier.id,provider:"SYNTECH"}},update:{adapter:"SYNTECH_JSON",fullFeedUrl:"ENV:SYNTECH_FULL_FEED_URL",updateFeedUrl:"ENV:SYNTECH_UPDATE_FEED_URL",scheduleMinutes:1440,enabled:true},create:{supplierId:supplier.id,provider:"SYNTECH",adapter:"SYNTECH_JSON",fullFeedUrl:"ENV:SYNTECH_FULL_FEED_URL",updateFeedUrl:"ENV:SYNTECH_UPDATE_FEED_URL",scheduleMinutes:1440,nextSyncAt:new Date()},include:{supplier:true}})
}
export async function syncSyntechFeed(mode:SyncMode,actorId?:string){
  const feed=await ensureSyntechFeed();const run=await prisma.supplierSyncRun.create({data:{feedId:feed.id,supplierId:feed.supplierId,mode,status:"RUNNING",triggeredById:actorId}});const now=new Date();
  try{const parsed=parseSyntechFeed(await new SyntechJsonAdapter().fetch(mode));let added=0,updated=0,skipped=0;
    if(mode==="FULL"){
      const rows=parsed.syntechstock.products.filter(isFullSyntechProduct).map(row=>catalogueData(row,feed.id,feed.supplierId,now));
      const existingRows=await prisma.supplierCatalogueProduct.findMany({where:{feedId:feed.id},select:{supplierProductId:true}}),existingSkus=new Set(existingRows.map(item=>item.supplierProductId));
      if(!rows.length||(existingRows.length>100&&rows.length<existingRows.length*.5))throw new Error(`Syntech full feed safety check failed: received ${rows.length} complete products for ${existingRows.length} cached products.`);
      for(let index=0;index<rows.length;index+=100){const batch=rows.slice(index,index+100);await prisma.$transaction(batch.map(data=>prisma.supplierCatalogueProduct.upsert({where:{feedId_supplierProductId:{feedId:feed.id,supplierProductId:data.supplierProductId}},update:data,create:data})),{timeout:120_000})}
      const currentSkus=rows.map(item=>item.supplierProductId);const removed=await prisma.supplierCatalogueProduct.count({where:{feedId:feed.id,active:true,supplierProductId:{notIn:currentSkus}}});
      if(currentSkus.length)await prisma.supplierCatalogueProduct.updateMany({where:{feedId:feed.id,supplierProductId:{notIn:currentSkus}},data:{active:false,availability:"DISCONTINUED"}});
      added=rows.filter(item=>!existingSkus.has(item.supplierProductId)).length;updated=rows.length-added;skipped=parsed.syntechstock.products.length-rows.length;
      const next=new Date(Date.now()+feed.scheduleMinutes*60_000);
      await prisma.supplierSyncRun.update({where:{id:run.id},data:{status:"SUCCEEDED",finishedAt:new Date(),recordsReceived:parsed.syntechstock.products.length,recordsAdded:added,recordsUpdated:updated,recordsRemoved:removed,recordsSkipped:skipped,diagnostics:{currency:parsed.syntechstock.currency,declaredCount:parsed.syntechstock.count}}});
      await prisma.supplierFeed.update({where:{id:feed.id},data:{lastSuccessAt:new Date(),lastError:null,nextSyncAt:next,lastFullSyncAt:new Date()}});
      return{runId:run.id,total:parsed.syntechstock.products.length,added,updated,removed,skipped};
    }
    if(parsed.syntechstock.products.every(row=>!isFullSyntechProduct(row))){
      const updates=parsed.syntechstock.products.map(row=>{const stock=Math.max(0,(row.cptstock??0)+(row.jhbstock??0)+(row.dbnstock??0));return{sku:row.sku,stock,locations:{capeTown:row.cptstock??0,johannesburg:row.jhbstock??0,durban:row.dbnstock??0},availability:stock>0?"IN_STOCK":row.nextshipmenteta?"INCOMING":"CHECK_AVAILABILITY",cost:numberOrNull(row.price),rrp:numberOrNull(row.rrp_incl),promo:typeof row.promo_price==="number"?row.promo_price:null,promoStart:parseFeedDate(row.promo_starts)?.toISOString()??null,promoEnd:parseFeedDate(row.promo_ends)?.toISOString()??null,nextShipment:parseFeedDate(row.nextshipmenteta)?.toISOString()??null,sourceUpdated:parseFeedDate(row.last_modified)?.toISOString()??null}});
      updated=await prisma.$executeRawUnsafe(`UPDATE "SupplierCatalogueProduct" p SET "stock"=u.stock,"stockByLocation"=u.locations,"availability"=u.availability,"costPrice"=u.cost,"recommendedRetail"=u.rrp,"promotionalPrice"=u.promo,"promotionStartsAt"=u."promoStart","promotionEndsAt"=u."promoEnd","nextShipmentAt"=u."nextShipment","sourceUpdatedAt"=u."sourceUpdated","lastSeenAt"=NOW(),"active"=true,"updatedAt"=NOW() FROM jsonb_to_recordset($1::jsonb) AS u(sku text,stock int,locations jsonb,availability text,cost numeric,rrp numeric,promo numeric,"promoStart" timestamp,"promoEnd" timestamp,"nextShipment" timestamp,"sourceUpdated" timestamp) WHERE p."feedId"=$2::uuid AND p."supplierProductId"=u.sku`,JSON.stringify(updates),feed.id);skipped=updates.length-updated;
    }else
    for(const row of parsed.syntechstock.products){
      if(!isFullSyntechProduct(row)){const found=await prisma.supplierCatalogueProduct.findUnique({where:{feedId_supplierProductId:{feedId:feed.id,supplierProductId:row.sku}}});if(!found){skipped++;continue}await prisma.supplierCatalogueProduct.update({where:{id:found.id},data:{stock:Math.max(0,(row.cptstock??0)+(row.jhbstock??0)+(row.dbnstock??0)),stockByLocation:{capeTown:row.cptstock??0,johannesburg:row.jhbstock??0,durban:row.dbnstock??0},availability:(row.cptstock??0)+(row.jhbstock??0)+(row.dbnstock??0)>0?"IN_STOCK":row.nextshipmenteta?"INCOMING":"CHECK_AVAILABILITY",costPrice:numberOrNull(row.price),recommendedRetail:numberOrNull(row.rrp_incl),promotionalPrice:typeof row.promo_price==="number"?row.promo_price:null,promotionStartsAt:parseFeedDate(row.promo_starts),promotionEndsAt:parseFeedDate(row.promo_ends),nextShipmentAt:parseFeedDate(row.nextshipmenteta),sourceUpdatedAt:parseFeedDate(row.last_modified),lastSeenAt:now,active:true}});updated++;continue}
      const data=catalogueData(row,feed.id,feed.supplierId,now);const found=await prisma.supplierCatalogueProduct.findUnique({where:{feedId_supplierProductId:{feedId:feed.id,supplierProductId:row.sku}},select:{id:true}});await prisma.supplierCatalogueProduct.upsert({where:{feedId_supplierProductId:{feedId:feed.id,supplierProductId:row.sku}},update:data,create:data});if(found)updated++;else added++;
    }
    const removed=0;const next=new Date(Date.now()+feed.scheduleMinutes*60_000);
    await prisma.supplierSyncRun.update({where:{id:run.id},data:{status:"SUCCEEDED",finishedAt:new Date(),recordsReceived:parsed.syntechstock.products.length,recordsAdded:added,recordsUpdated:updated,recordsRemoved:removed,recordsSkipped:skipped,diagnostics:{currency:parsed.syntechstock.currency,declaredCount:parsed.syntechstock.count}}});await prisma.supplierFeed.update({where:{id:feed.id},data:{lastSuccessAt:new Date(),lastError:null,nextSyncAt:next,lastIncrementalSyncAt:new Date()}});return{runId:run.id,total:parsed.syntechstock.products.length,added,updated,removed,skipped};
  }catch(error){const message=error instanceof Error?error.message:String(error);await prisma.supplierSyncRun.update({where:{id:run.id},data:{status:"FAILED",finishedAt:new Date(),error:message}});await prisma.supplierFeed.update({where:{id:feed.id},data:{lastError:message,nextSyncAt:new Date(Date.now()+15*60_000)}});throw error}
}
