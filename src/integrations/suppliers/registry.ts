import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { syncSyntechFeed, type SyncMode } from "@/integrations/syntech/feed";
export const PINNACLE_ID="86000000-0000-4000-8000-000000000002";
export async function ensurePinnacle(){
 const supplier=await prisma.supplier.upsert({where:{id:PINNACLE_ID},update:{},create:{id:PINNACLE_ID,companyName:"Pinnacle ICT",approvalStatus:"APPROVED",purchasingEnabled:false,accountNumber:"INN038",paymentTerms:"COD",website:"https://www.pinnacle.co.za"}});
 return prisma.supplierFeed.upsert({where:{supplierId_provider:{supplierId:supplier.id,provider:"PINNACLE"}},update:{},create:{supplierId:supplier.id,provider:"PINNACLE",adapter:"PINNACLE_XML",fullFeedUrl:"ENV:PINNACLE_XML_FEED_URL",scheduleMinutes:1440,enabled:false}});
}
export class PinnacleXmlAdapter {
 readonly provider="PINNACLE";
 async fetch():Promise<never>{throw new Error("Pinnacle XML mapping awaits a real feed sample. Import and purchasing remain disabled.");}
}
async function syncAllSuppliersUnlocked(mode:SyncMode){
 await ensurePinnacle();
 const results=[];
 for(const provider of ["SYNTECH","PINNACLE"]){
  const feed=await prisma.supplierFeed.findFirst({where:{provider}});
  if(provider==="PINNACLE"){results.push({provider,status:"AWAITING_XML_MAPPING"});continue;}
  if(feed&&!feed.enabled){results.push({provider,status:"DISABLED"});continue;}
  try{results.push({provider,status:"SUCCEEDED",mode,...await syncSyntechFeed(mode)});}catch{results.push({provider,status:"FAILED",mode});}
 }
 return results;
}

export async function syncAllSuppliers(mode:SyncMode="INCREMENTAL"){
 const owner=randomUUID(),expiresAt=Date.now()+30*60_000;
 const acquired=await prisma.$executeRaw`INSERT INTO "SiteSetting" (id,key,value,"createdAt","updatedAt") VALUES (${randomUUID()}::uuid,'supplier.sync.lease',${JSON.stringify({owner,expiresAt})}::jsonb,NOW(),NOW()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,"updatedAt"=NOW() WHERE ("SiteSetting".value->>'expiresAt')::numeric <= ${Date.now()}`;
 if(!acquired)return [{provider:"ALL",status:"ALREADY_RUNNING"}];
 try{return await syncAllSuppliersUnlocked(mode);}finally{await prisma.siteSetting.deleteMany({where:{key:"supplier.sync.lease",value:{path:["owner"],equals:owner}}});}
}
