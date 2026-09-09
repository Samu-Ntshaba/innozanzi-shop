"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { RETAIL_PAYMENT_SETTINGS_KEY, retailPaymentSettingsSchema } from "./settings";

export async function saveRetailPaymentSettings(formData: FormData) {
  const ctx = await requirePermission("payments.approve");
  const data = retailPaymentSettingsSchema.parse({
    ...Object.fromEntries(formData),
    eftEnabled: formData.get("eftEnabled") === "on",
  });
  await prisma.$transaction(async tx => {
    const before = await tx.siteSetting.findUnique({ where: { key: RETAIL_PAYMENT_SETTINGS_KEY } });
    const previous = retailPaymentSettingsSchema.safeParse(before?.value);
    const setting = await tx.siteSetting.upsert({
      where: { key: RETAIL_PAYMENT_SETTINGS_KEY },
      create: { key: RETAIL_PAYMENT_SETTINGS_KEY, value: data, description: "Customer-facing retail EFT availability and banking instructions." },
      update: { value: data },
    });
    await tx.auditLog.create({ data: { actorId: ctx.user.id, action: "payments.retail-settings.update", entityType: "SiteSetting", entityId: setting.id, before: previous.success ? { ...previous.data, accountNumber: previous.data.accountNumber ? "configured" : "" } : undefined, after: { ...data, accountNumber: data.accountNumber ? "configured" : "" } } });
  });
  revalidatePath("/admin/payments");
  revalidatePath("/checkout");
  revalidatePath("/account/orders");
  revalidatePath("/account/quotations");
}
