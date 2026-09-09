"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/domain/auth/session";
import { gatewayConfigured } from "@/integrations/payments/approved-gateways";
import { prisma } from "@/lib/prisma";
import { publicSiteUrl } from "@/lib/public-site-url";
import { beginHostedOrderPayment } from "./orchestration";
import { eftConfigured, getRetailPaymentSettings } from "./settings";

export async function retryOrderPayment(formData: FormData) {
  const ctx = await requireUser();
  const input = z.object({ orderId: z.string().uuid(), paymentMethod: z.enum(["OZOW", "EFT"]) }).parse(Object.fromEntries(formData));
  const settings = await getRetailPaymentSettings();
  if (input.paymentMethod === "OZOW" && !gatewayConfigured("OZOW")) throw new Error("Ozow is temporarily unavailable.");
  if (input.paymentMethod === "EFT" && !eftConfigured(settings)) throw new Error("EFT is not enabled yet.");
  const payment = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId}::uuid FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: input.orderId } });
    if (order.userId !== ctx.user.id || order.status !== "AWAITING_PAYMENT" || !["PENDING", "FAILED", "CANCELLED"].includes(order.paymentStatus)) throw new Error("This order is not available for another payment attempt.");
    await tx.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "CANCELLED", failureReason: "Replaced by a new customer payment attempt." } });
    const created = await tx.payment.create({ data: { orderId: order.id, provider: input.paymentMethod, status: "PENDING", amount: order.grandTotal, currency: order.currency, idempotencyKey: `retry:${order.id}:${randomUUID()}`, isTestData: order.isTestData } });
    await tx.order.update({ where: { id: order.id }, data: { paymentMethod: input.paymentMethod, paymentStatus: "PENDING" } });
    await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: "AWAITING_PAYMENT", toStatus: "AWAITING_PAYMENT", actorId: ctx.user.id, note: `Customer started a new ${input.paymentMethod} payment attempt.` } });
    return { ...created, orderNumber: order.orderNumber };
  }, { isolationLevel: "Serializable" });
  if (input.paymentMethod === "EFT") redirect("/account/orders/" + encodeURIComponent(payment.orderNumber) + "?payment=eft");
  const session = await beginHostedOrderPayment({ paymentId: payment.id, callbackUrl: publicSiteUrl() + "/api/payments/return/" + payment.id });
  if (!session.redirectUrl) throw new Error("Secure checkout is unavailable.");
  redirect(session.redirectUrl);
}
