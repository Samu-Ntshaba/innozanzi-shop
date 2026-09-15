"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { pricingImpact } from "./impact";
import { parsePricingForm, PricingPublicationError, publishPricing } from "./publication";
import { getPricingDraft } from "./draft";

function failure(error:unknown){
 if(error instanceof PricingPublicationError)return {error:error.message};
 const reference=randomUUID();
 console.error("Pricing operation failed",{reference,name:error instanceof Error?error.name:"Unknown",code:error&&typeof error==="object"&&"code" in error?String(error.code):undefined});
 return {error:`Pricing could not be saved or calculated. The active settings were retained. Reference ${reference}.`};
}
export async function previewCommerceSettings(form:FormData){
 await requirePermission("settings.manage");
 try{return {ok:true as const,impact:await pricingImpact(parsePricingForm(form))};}
 catch(error){return {ok:false as const,...failure(error)};}
}
export async function saveDraftCommerceSettings(form:FormData){
 const ctx=await requirePermission("settings.manage");
 try{
  const settings=parsePricingForm(form);
  const version=randomUUID(),savedAt=new Date();
  const metadata={version,savedAt:savedAt.toISOString(),savedBy:ctx.user.name??ctx.user.email??"Administrator"};
  const value={...settings,_draft:metadata};
  await prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('commerce.pricing.v1',0))::text AS locked`;
   await tx.siteSetting.upsert({where:{key:"commerce.pricing.draft"},create:{key:"commerce.pricing.draft",value},update:{value}});
   await tx.auditLog.create({data:{id:version,actorId:ctx.user.id,action:"commerce.pricing.draft",entityType:"SiteSetting",entityId:"commerce.pricing.draft",after:settings,metadata:{savedAt:savedAt.toISOString()}}});
  });
  revalidatePath("/admin/pricing");
  return {error:"",success:"Draft saved successfully.",draft:{settings,...metadata}};
 }catch(error){return {...failure(error),success:""};}
}
export async function loadDraftCommerceSettings(){
 await requirePermission("settings.manage");
 try{const draft=await getPricingDraft();return draft?{ok:true as const,draft}:{ok:false as const,error:"No saved pricing draft is available."};}
 catch(error){return {ok:false as const,...failure(error)};}
}
export async function saveCommerceSettings(_state:{error:string;success:string},form:FormData){
 const ctx=await requirePermission("settings.manage");
 let published:Awaited<ReturnType<typeof publishPricing>>;
 try{
  const settings=parsePricingForm(form),draft=await getPricingDraft();
  if(!draft||JSON.stringify(draft.settings)!==JSON.stringify(settings))throw new PricingPublicationError("Save these exact settings as a draft, then load or preview them before publishing.");
  published=await publishPricing({settings,reason:String(form.get("reason")??"").trim(),actorId:ctx.user.id,impactToken:String(form.get("impactToken")??""),confirmed:form.get("confirmImpact")==="on"});
 }catch(error){return {...failure(error),success:""};}
 // A refresh failure after commit must not be reported as a rolled-back publication.
 try{revalidatePath("/","layout");}
 catch{console.error("Pricing published but cache refresh failed",{version:published.version});return {error:"",success:`Pricing version ${published.version} was published. Refresh the page to check the active version.`};}
 return {error:"",success:`Pricing is active. Published version ${published.version}.`};
}
