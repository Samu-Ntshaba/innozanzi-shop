"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { commerceSchema } from "./config";
import { protectedPrice } from "./engine";
export async function saveCommerceSettings(form:FormData){
 const ctx=await requirePermission("settings.manage");const reason=String(form.get("reason")??"").trim();if(reason.length<8||reason.length>500)throw new Error("Describe the reason for this pricing change.");
 const data=commerceSchema.parse({...Object.fromEntries(form),vatRegistered:form.get("vatRegistered")==="true"});
 for(const cost of [1,800,5000,15000])for(const gateway of ["OZOW","PAYFAST"] as const)protectedPrice(cost,data,gateway);
 await prisma.$transaction(async tx=>{const before=await tx.siteSetting.findUnique({where:{key:"commerce.pricing.v1"}});await tx.siteSetting.upsert({where:{key:"commerce.pricing.v1"},create:{key:"commerce.pricing.v1",value:data},update:{value:data}});await tx.auditLog.create({data:{actorId:ctx.user.id,action:"commerce.pricing.update",entityType:"SiteSetting",entityId:"commerce.pricing.v1",before:before?.value??undefined,after:data,metadata:{reason}}});});
 revalidatePath("/","layout");
}
