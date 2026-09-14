import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { commerceSchema, type CommerceSettings } from "./config";
import { pricingImpact } from "./impact";

export class PricingPublicationError extends Error {}
export function parsePricingForm(form:FormData){
 let customCosts:unknown;
 try{customCosts=JSON.parse(String(form.get("customCosts")??"[]"));}catch{throw new PricingPublicationError("Additional pricing costs contain invalid data. Reload the form and try again.");}
 const parsed=commerceSchema.safeParse({...Object.fromEntries(form),customCosts,vatRegistered:form.get("vatRegistered")==="true"});
 if(!parsed.success)throw new PricingPublicationError(parsed.error.issues.map(issue=>`${issue.path.join(".")||"Settings"}: ${issue.message}`).join(" "));
 return parsed.data;
}
export async function publishPricing(input:{settings:CommerceSettings;reason:string;actorId:string;impactToken:string;confirmed:boolean}){
 if(input.reason.trim().length<8||input.reason.trim().length>500)throw new PricingPublicationError("Describe the reason for this pricing change (8–500 characters).");
 const settings=commerceSchema.parse(input.settings),impact=await pricingImpact(settings);
 if(!input.confirmed||input.impactToken!==impact.token)throw new PricingPublicationError("The preview is missing or outdated. Preview the catalogue again and confirm the impact before publishing.");
 const version=randomUUID(),publishedAt=new Date().toISOString();
 await prisma.$transaction(async tx=>{
  // PostgreSQL returns void here; Prisma requires a supported scalar result type.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('commerce.pricing.v1',0))::text AS locked`;
  const before=await tx.siteSetting.findUnique({where:{key:"commerce.pricing.v1"}});
  if(createHash("sha256").update(JSON.stringify(commerceSchema.parse(before?.value??{}))).digest("hex")!==impact.baseline)throw new PricingPublicationError("Another administrator published settings. Preview again before publishing.");
  await tx.siteSetting.upsert({where:{key:"commerce.pricing.v1"},create:{key:"commerce.pricing.v1",value:settings},update:{value:settings}});
  const active={version,publishedAt,approvedBy:input.actorId,settingsHash:createHash("sha256").update(JSON.stringify(settings)).digest("hex")};
  await tx.siteSetting.upsert({where:{key:"commerce.pricing.active"},create:{key:"commerce.pricing.active",value:active},update:{value:active}});
  await tx.auditLog.create({data:{id:version,actorId:input.actorId,action:"commerce.pricing.update",entityType:"SiteSetting",entityId:"commerce.pricing.v1",before:before?.value??undefined,after:settings,metadata:{reason:input.reason,impact,publishedAt}}});
 },{timeout:15000});
 return {version,publishedAt};
}
