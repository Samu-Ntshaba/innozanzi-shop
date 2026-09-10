import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { syncSyntechFeed, type SyncMode } from "@/integrations/syntech/feed";
import { ensurePinnacleFeed, syncPinnacleFeed } from "@/integrations/pinnacle/feed";
export { PINNACLE_ID, PinnacleXmlAdapter, ensurePinnacleFeed as ensurePinnacle } from "@/integrations/pinnacle/feed";
async function syncAllSuppliersUnlocked(mode:SyncMode){
 await ensurePinnacleFeed();
 const results=[];
 for(const provider of ["SYNTECH","PINNACLE"]){
  const feed=await prisma.supplierFeed.findFirst({where:{provider}});
  if(feed&&!feed.enabled){results.push({provider,status:"DISABLED"});continue;}
  try{results.push({provider,status:"SUCCEEDED",mode,...await (provider==="PINNACLE"?syncPinnacleFeed(mode):syncSyntechFeed(mode))});}catch{results.push({provider,status:"FAILED",mode});}
 }
 return results;
}

export async function syncAllSuppliers(mode:SyncMode="INCREMENTAL"){
 const owner=randomUUID(),expiresAt=Date.now()+30*60_000;
 const acquired=await prisma.$executeRaw`INSERT INTO "SiteSetting" (id,key,value,"createdAt","updatedAt") VALUES (${randomUUID()}::uuid,'supplier.sync.lease',${JSON.stringify({owner,expiresAt})}::jsonb,NOW(),NOW()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,"updatedAt"=NOW() WHERE ("SiteSetting".value->>'expiresAt')::numeric <= ${Date.now()}`;
 if(!acquired)return [{provider:"ALL",status:"ALREADY_RUNNING"}];
 try{return await syncAllSuppliersUnlocked(mode);}finally{await prisma.siteSetting.deleteMany({where:{key:"supplier.sync.lease",value:{path:["owner"],equals:owner}}});}
}
