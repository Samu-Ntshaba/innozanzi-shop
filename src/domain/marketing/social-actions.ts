"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

const campaignSchema = z.object({
  name: z.string().trim().min(3).max(120),
  objective: z.string().trim().min(3).max(300),
  audience: z.string().trim().min(3).max(200),
  focusType: z.enum(["PRODUCT", "FEATURE", "MIXED"]),
  instructions: z.string().trim().max(2_000).optional(),
  channels: z.array(z.enum(["LINKEDIN", "FACEBOOK", "INSTAGRAM"])).min(1),
  targetProductIds: z.array(z.string().uuid()).max(50),
  targetFeatureKeys: z.array(z.enum(["PC_BUILDER", "GAMING", "BUSINESS_PROCUREMENT", "SUPPORT", "INSIGHTS"])).max(5),
  postsPerDay: z.coerce.number().int().min(1).max(4),
  priority: z.coerce.number().int().min(1).max(1_000),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  status: z.enum(["DRAFT", "ACTIVE"]),
});

export async function createSocialCampaign(formData: FormData) {
  const ctx = await requirePermission("marketing.content.edit");
  const raw = Object.fromEntries(formData);
  const data = campaignSchema.parse({
    ...raw,
    channels: formData.getAll("channels"),
    targetProductIds: formData.getAll("targetProductIds").filter(Boolean),
    targetFeatureKeys: formData.getAll("targetFeatureKeys").filter(Boolean),
  });
  if (data.endsAt <= data.startsAt) throw new Error("Campaign end must be after its start.");
  if (data.focusType === "PRODUCT" && !data.targetProductIds.length) throw new Error("Choose at least one product for a product campaign.");
  if (data.focusType === "FEATURE" && !data.targetFeatureKeys.length) throw new Error("Choose at least one feature for a feature campaign.");
  if (data.status === "ACTIVE") await requirePermission("marketing.content.publish");
  const campaign = await prisma.socialCampaign.create({ data: { ...data, instructions: data.instructions || null, createdById: ctx.user.id, updatedById: ctx.user.id } });
  await prisma.auditLog.create({ data: { actorId: ctx.user.id, action: "marketing.social.campaign.create", entityType: "SocialCampaign", entityId: campaign.id, after: { name: campaign.name, status: campaign.status, focusType: campaign.focusType, startsAt: campaign.startsAt, endsAt: campaign.endsAt } } });
  revalidatePath("/admin/marketing/social");
}

export async function setSocialCampaignStatus(formData: FormData) {
  const ctx = await requirePermission("marketing.content.publish");
  const { id, status } = z.object({ id: z.string().uuid(), status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]) }).parse(Object.fromEntries(formData));
  const previous = await prisma.socialCampaign.findUniqueOrThrow({ where: { id } });
  await prisma.$transaction([
    prisma.socialCampaign.update({ where: { id }, data: { status, updatedById: ctx.user.id } }),
    prisma.auditLog.create({ data: { actorId: ctx.user.id, action: "marketing.social.campaign.status", entityType: "SocialCampaign", entityId: id, before: { status: previous.status }, after: { status } } }),
  ]);
  revalidatePath("/admin/marketing/social");
}
