"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

export async function saveOrderOperationsSettings(formData: FormData) {
  const context = await requirePermission("settings.manage");
  const enabled = formData.get("automaticPaidProcessing") === "on";
  await prisma.$transaction(async tx => {
    await tx.marketingSetting.upsert({
      where: { key: "orders.automaticPaidProcessing" },
      create: { key: "orders.automaticPaidProcessing", value: enabled, description: "Automatically move healthy verified paid orders into processing.", updatedById: context.user.id },
      update: { value: enabled, updatedById: context.user.id },
    });
    await tx.auditLog.create({ data: { actorId: context.user.id, action: "orders.automation.settings.update", entityType: "MarketingSetting", entityId: "orders.automaticPaidProcessing", after: { enabled } } });
  });
  revalidatePath("/admin/orders/settings");
  redirect("/admin/orders/settings?saved=1");
}
