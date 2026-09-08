"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/domain/auth/session";
import { consumeRateLimit } from "@/domain/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { deliveryFromForm } from "./service";

export async function saveAddress(_state: { error: string; success: boolean }, form: FormData) {
  const ctx = await requireUser();
  if (!(await consumeRateLimit(`address:save:${ctx.user.id}`, 30, 3600000)).allowed) return { error: "Please wait before saving more addresses.", success: false };
  try {
    // This action always creates an address from confirmed form fields.
    form.delete("addressId");
    const data = await deliveryFromForm(ctx.user.id, form);
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${ctx.user.id}::uuid FOR UPDATE`;
      const count = await tx.address.count({ where: { userId: ctx.user.id, deletedAt: null } });
      if (count >= 20) throw new Error("You can save up to 20 addresses. Remove an old address first.");
      await tx.address.create({ data: { ...data, userId: ctx.user.id, type: "DELIVERY", isDefault: count === 0 } });
    });
  } catch (error) { return { error: error instanceof Error && /^(Complete|Please select|You can save)/.test(error.message) ? error.message : "We could not save your address. Please retry.", success: false }; }
  revalidatePath("/account/addresses"); revalidatePath("/checkout");
  return { error: "", success: true };
}
export async function changeAddress(form: FormData) {
  const ctx = await requireUser();
  const id = z.string().uuid().parse(form.get("id"));
  const action = z.enum(["default", "remove"]).parse(form.get("action"));
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${ctx.user.id}::uuid FOR UPDATE`;
    const owned = await tx.address.findFirst({ where: { id, userId: ctx.user.id, deletedAt: null, type: { in: ["DELIVERY", "BOTH"] } } });
    if (!owned) return;
    if (action === "default") {
      await tx.address.updateMany({ where: { userId: ctx.user.id, deletedAt: null }, data: { isDefault: false } });
      await tx.address.update({ where: { id }, data: { isDefault: true } });
    } else {
      await tx.address.delete({ where: { id } });
      if (owned.isDefault) {
        const next = await tx.address.findFirst({ where: { userId: ctx.user.id, deletedAt: null, type: { in: ["DELIVERY", "BOTH"] } }, orderBy: { createdAt: "desc" } });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
  });
  revalidatePath("/account/addresses"); revalidatePath("/checkout");
}
