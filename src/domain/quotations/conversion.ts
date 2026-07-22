"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/domain/auth/session";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";

export async function convertQuotationToOrder(formData: FormData) {
  const context = await requirePermission("quotations.manage");
  const id = z.string().uuid().parse(formData.get("id"));
  const order = await prisma.$transaction(async (tx) => {
    const quote = await tx.quotation.findUniqueOrThrow({ where: { id }, include: { items: true, quotationRequest: true } });
    if (quote.convertedOrderId) return tx.order.findUniqueOrThrow({ where: { id: quote.convertedOrderId } });
    if (quote.status !== "ACCEPTED") throw new Error("Only accepted quotations can be converted.");
    const order = await tx.order.create({ data: { orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`, userId: quote.customerId, email: quote.quotationRequest?.email ?? "unknown@example.com", phone: quote.quotationRequest?.phone, companyName: quote.quotationRequest?.companyName, vatNumber: quote.quotationRequest?.vatNumber, subtotal: quote.subtotal, discountTotal: quote.discountTotal, deliveryTotal: quote.deliveryTotal, vatTotal: quote.vatTotal, grandTotal: quote.grandTotal, status: "AWAITING_PAYMENT", paymentStatus: "PENDING", paymentMethod: "EFT", items: { create: quote.items.map((item) => ({ productId: item.productId, variantId: item.variantId, productName: item.productName, sku: item.sku ?? "QUOTE", quantity: item.quantity, unitPrice: item.unitPrice, discountTotal: item.discountTotal, vatRate: item.vatRate, vatTotal: item.vatTotal, lineTotal: item.lineTotal })) } } });
    await tx.quotation.update({ where: { id }, data: { status: "CONVERTED", convertedOrderId: order.id } });
    await tx.auditLog.create({ data: { actorId: context.user.id, action: "quotation.convert", entityType: "Quotation", entityId: id, after: { orderId: order.id, orderNumber: order.orderNumber } } });
    return order;
  });
  await enqueueEmail(emailTemplates.orderCreated(order.email, order.orderNumber, order.grandTotal.toString()), order.userId ?? undefined);
  revalidatePath("/admin/quotations");
  redirect("/admin/orders");
}
