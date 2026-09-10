import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureSyntechFeed, syncSyntechFeed, type SyncMode } from "@/integrations/syntech/feed";
import { ensurePinnacleFeed, syncPinnacleFeed } from "@/integrations/pinnacle/feed";
import { enqueueEmail } from "@/integrations/email/outbox";
import { supportEmail } from "@/lib/support";
export { PINNACLE_ID, PinnacleXmlAdapter, ensurePinnacleFeed as ensurePinnacle } from "@/integrations/pinnacle/feed";
export type SupplierProvider="SYNTECH"|"PINNACLE";
async function alertSyncFailure(provider:SupplierProvider,message:string){
 await enqueueEmail({to:supportEmail,subject:`Supplier sync failed: ${provider}`,text:`The ${provider} catalogue refresh failed.\n\n${message.slice(0,1000)}\n\nOpen Admin > Supplier feeds and Railway logs before the freshness window expires.`,html:`<p>The <strong>${provider}</strong> catalogue refresh failed.</p><p>${message.replace(/[<>&]/g,character=>({"<":"&lt;",">":"&gt;","&":"&amp;"})[character]!)}</p><p>Open Admin &gt; Supplier feeds and Railway logs before the freshness window expires.</p>`,idempotencyKey:`supplier-sync-failed:${provider}:${new Date().toISOString().slice(0,13)}`}).catch(error=>console.error("Supplier sync alert could not be queued",error));
}
async function syncAllSuppliersUnlocked(mode:SyncMode,providers:SupplierProvider[]){
 const [syntech,pinnacle]=await Promise.all([ensureSyntechFeed(),ensurePinnacleFeed()]);
 const configured={SYNTECH:{feed:syntech,sync:()=>syncSyntechFeed(mode)},PINNACLE:{feed:pinnacle,sync:()=>syncPinnacleFeed(mode)}};
 const results=[];
 for(const provider of providers){
  const {feed,sync}=configured[provider];
  if(feed&&!feed.enabled){results.push({provider,status:"DISABLED"});continue;}
  try{results.push({provider,status:"SUCCEEDED",mode,...await sync()});}catch(error){const message=error instanceof Error?error.message:String(error);await alertSyncFailure(provider,message);results.push({provider,status:"FAILED",mode,error:message.slice(0,160)});}
 }
 return results;
}

export async function syncAllSuppliers(mode:SyncMode="FULL",providers:SupplierProvider[]=["SYNTECH","PINNACLE"]){
 const owner=randomUUID(),expiresAt=Date.now()+30*60_000;
 const acquired=await prisma.$executeRaw`INSERT INTO "SiteSetting" (id,key,value,"createdAt","updatedAt") VALUES (${randomUUID()}::uuid,'supplier.sync.lease',${JSON.stringify({owner,expiresAt})}::jsonb,NOW(),NOW()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,"updatedAt"=NOW() WHERE ("SiteSetting".value->>'expiresAt')::numeric <= ${Date.now()}`;
 if(!acquired)return [{provider:"ALL",status:"ALREADY_RUNNING"}];
 try{return await syncAllSuppliersUnlocked(mode,providers);}finally{await prisma.siteSetting.deleteMany({where:{key:"supplier.sync.lease",value:{path:["owner"],equals:owner}}});}
}
