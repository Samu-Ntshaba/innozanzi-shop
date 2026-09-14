"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { commerceSchema } from "./config";
import { pricingImpact } from "./impact";
import { protectedPrice } from "./engine";
function parseSettings(form:FormData){
 const customCosts=JSON.parse(String(form.get("customCosts")??"[]"));
 return commerceSchema.parse({...Object.fromEntries(form),customCosts,vatRegistered:form.get("vatRegistered")==="true"});
}
export async function previewCommerceSettings(form:FormData){
 await requirePermission("settings.manage");
 return pricingImpact(parseSettings(form));
}
export async function saveCommerceSettings(form:FormData){
 const ctx=await requirePermission("settings.manage");const reason=String(form.get("reason")??"").trim();if(reason.length<8||reason.length>500)throw new Error("Describe the reason for this pricing change.");
 const data=parseSettings(form);
 const impact=await pricingImpact(data);
 if(form.get("confirmImpact")!=="on"||form.get("impactToken")!==impact.token)throw new Error("Preview the current catalogue impact and confirm it before publishing. Prices or settings may have changed.");
 for(const cost of [1,800,5000,15000])for(const gateway of ["OZOW","PAYFAST"] as const)protectedPrice(cost,data,gateway);
 await prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('commerce.pricing.v1',0))`;const before=await tx.siteSetting.findUnique({where:{key:"commerce.pricing.v1"}});if(createHash("sha256").update(JSON.stringify(commerceSchema.parse(before?.value??{}))).digest("hex")!==impact.baseline)throw new Error("Pricing settings changed. Preview again before publishing.");await tx.siteSetting.upsert({where:{key:"commerce.pricing.v1"},create:{key:"commerce.pricing.v1",value:data},update:{value:data}});await tx.auditLog.create({data:{actorId:ctx.user.id,action:"commerce.pricing.update",entityType:"SiteSetting",entityId:"commerce.pricing.v1",before:before?.value??undefined,after:data,metadata:{reason,impact}}});});
 revalidatePath("/","layout");
}
