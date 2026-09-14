"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { pricingImpact } from "./impact";
import { parsePricingForm, PricingPublicationError, publishPricing } from "./publication";

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
  await prisma.$transaction(async tx=>{
   await tx.siteSetting.upsert({where:{key:"commerce.pricing.draft"},create:{key:"commerce.pricing.draft",value:settings},update:{value:settings}});
   await tx.auditLog.create({data:{actorId:ctx.user.id,action:"commerce.pricing.draft",entityType:"SiteSetting",entityId:"commerce.pricing.draft"}});
  });
  return {error:"",success:"Draft saved. Active prices have not changed."};
 }catch(error){return {...failure(error),success:""};}
}
export async function saveCommerceSettings(_state:{error:string;success:string},form:FormData){
 const ctx=await requirePermission("settings.manage");
 let published:Awaited<ReturnType<typeof publishPricing>>;
 try{
  published=await publishPricing({settings:parsePricingForm(form),reason:String(form.get("reason")??"").trim(),actorId:ctx.user.id,impactToken:String(form.get("impactToken")??""),confirmed:form.get("confirmImpact")==="on"});
 }catch(error){return {...failure(error),success:""};}
 // A refresh failure after commit must not be reported as a rolled-back publication.
 try{revalidatePath("/","layout");}
 catch{console.error("Pricing published but cache refresh failed",{version:published.version});return {error:"",success:`Pricing version ${published.version} was published. Refresh the page to check the active version.`};}
 return {error:"",success:`Pricing is active. Published version ${published.version}.`};
}
