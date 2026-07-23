"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
export async function saveDocumentBranding(formData:FormData){const context=await requirePermission("documents.templates.manage");const data=z.object({companyName:z.string().trim().min(2).max(160),tagline:z.string().trim().max(160),registration:z.string().trim().max(160),address:z.string().trim().min(5).max(500),email:z.string().email(),phone:z.string().trim().max(60),website:z.string().url(),footer:z.string().trim().max(500)}).parse(Object.fromEntries(formData));await prisma.$transaction(async tx=>{for(const[key,value]of Object.entries(data))await tx.documentBrandingSetting.upsert({where:{key},update:{value,updatedById:context.user.id},create:{key,value,updatedById:context.user.id}});await tx.auditLog.create({data:{actorId:context.user.id,action:"document.branding.update",entityType:"DocumentBrandingSetting",entityId:"global",after:data}})});revalidatePath("/admin/documents")}
