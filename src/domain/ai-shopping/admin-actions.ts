"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

export async function saveAISettings(formData:FormData){const ctx=await requirePermission("marketing.analytics.view"),data=z.object({dailyWarning:z.coerce.number().min(0).max(1_000_000),monthlyWarning:z.coerce.number().min(0).max(10_000_000),tokenWarning:z.coerce.number().int().min(100).max(1_000_000),enabled:z.string().optional()}).parse(Object.fromEntries(formData)),values=[["ai.shopping.enabled",data.enabled==="on"],["ai.dailyWarning",data.dailyWarning],["ai.monthlyWarning",data.monthlyWarning],["ai.tokenWarning",data.tokenWarning]] as const;await prisma.$transaction(values.map(([key,value])=>prisma.marketingSetting.upsert({where:{key},create:{key,value,updatedById:ctx.user.id},update:{value,updatedById:ctx.user.id}})));await prisma.auditLog.create({data:{actorId:ctx.user.id,action:"ai.shopping.settings.update",entityType:"MarketingSetting",entityId:"ai-shopping",after:data}});revalidatePath("/admin/ai");redirect("/admin/ai?saved=1")}
