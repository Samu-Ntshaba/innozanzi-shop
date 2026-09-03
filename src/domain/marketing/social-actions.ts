"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { generateDailySocialContent } from "@/domain/marketing/social-content";
import { prisma } from "@/lib/prisma";

export async function saveSocialSettings(formData: FormData) {
  const ctx = await requirePermission("marketing.content.edit");
  const data = z.object({ recipientEmail: z.string().trim().email(), generationHour: z.coerce.number().int().min(0).max(23), brandDirection: z.string().trim().min(20).max(1_000), enabled: z.string().optional() }).parse(Object.fromEntries(formData));
  const values = [["social.recipientEmail", data.recipientEmail, "Recipient of daily, ready-to-post social content."], ["social.generationHour", data.generationHour, "Preferred generation hour in Africa/Johannesburg."], ["social.brandDirection", data.brandDirection, "Visual direction applied to generated feature artwork."], ["social.enabled", data.enabled === "on", "Whether the daily social content cron is enabled."]] as const;
  await prisma.$transaction(values.map(([key, value, description]) => prisma.marketingSetting.upsert({ where: { key }, create: { key, value, description, updatedById: ctx.user.id }, update: { value, description, updatedById: ctx.user.id } })));
  await prisma.auditLog.create({ data: { actorId: ctx.user.id, action: "marketing.social.settings.update", entityType: "MarketingSetting", entityId: "social", after: { recipientEmail: data.recipientEmail, generationHour: data.generationHour, enabled: data.enabled === "on" } } });
  revalidatePath("/admin/marketing/settings"); redirect("/admin/marketing/settings?saved=1");
}

export async function generateSocialContentNow() {
  const ctx = await requirePermission("marketing.content.edit");
  try { const result = await generateDailySocialContent({ actorId: ctx.user.id }); revalidatePath("/admin/marketing/social"); redirect(`/admin/marketing/social?result=${result.status}`); }
  catch (error) { if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error; console.error("Manual social generation failed", error); redirect("/admin/marketing/social?result=failed"); }
}
