"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/domain/auth/session";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";
import { assertOrderTransition, reservationAfterRelease } from "@/domain/orders/lifecycle";

const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const text = z.string().trim().min(1).max(200);

async function audit(actorId: string, action: string, entityType: string, entityId: string, before: unknown, after: unknown) {
  await prisma.auditLog.create({ data: { actorId, action, entityType, entityId, before: before as object | undefined, after: after as object | undefined } });
}

export async function createCategory(formData: FormData) {
  const context = await requirePermission("products.update");
  const value = text.parse(formData.get("name"));
  const category = await prisma.category.create({ data: { name: value, slug: slugify(value) } });
  await audit(context.user.id, "category.create", "Category", category.id, undefined, { name: category.name, slug: category.slug });
  revalidatePath("/admin/categories");
}

export async function createBrand(formData: FormData) {
  const context = await requirePermission("products.update");
  const value = text.parse(formData.get("name"));
  const brand = await prisma.brand.create({ data: { name: value, slug: slugify(value), website: z.string().url().optional().or(z.literal("")).parse(formData.get("website")) || null } });
  await audit(context.user.id, "brand.create", "Brand", brand.id, undefined, { name: brand.name, slug: brand.slug });
  revalidatePath("/admin/brands");
}

export async function createSupplier(formData: FormData) {
  const context = await requirePermission("products.update");
  const data = z.object({ companyName: text, email: z.string().email().optional().or(z.literal("")), phone: z.string().max(40).optional() }).parse(Object.fromEntries(formData));
  const supplier = await prisma.supplier.create({ data: { ...data, email: data.email || null } });
  await audit(context.user.id, "supplier.create", "Supplier", supplier.id, undefined, data);
  revalidatePath("/admin/suppliers");
}

export async function setProductStatus(formData: FormData) {
  const context = await requirePermission("products.update");
  const { id, status } = z.object({ id: z.string().uuid(), status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]) }).parse(Object.fromEntries(formData));
  const before = await prisma.product.findUniqueOrThrow({ where: { id }, select: { status: true } });
  const product = await prisma.product.update({ where: { id }, data: { status, publishedAt: status === "PUBLISHED" ? new Date() : undefined } });
  await audit(context.user.id, "product.status", "Product", id, before, { status: product.status });
  revalidatePath("/admin/products");
}

export async function adjustInventory(formData: FormData) {
  const context = await requirePermission("inventory.manage");
  const { id, quantity, reason } = z.object({ id: z.string().uuid(), quantity: z.coerce.number().int().refine((n) => n !== 0), reason: z.string().trim().min(3).max(300) }).parse(Object.fromEntries(formData));
  await prisma.$transaction(async (tx) => {
    const before = await tx.inventory.findUniqueOrThrow({ where: { id } });
    const onHand = before.onHand + quantity;
    if (onHand < before.reserved) throw new Error("Adjustment would reduce stock below reserved quantity.");
    const inventory = await tx.inventory.update({ where: { id }, data: { onHand } });
    await tx.inventoryMovement.create({ data: { inventoryId: id, actorId: context.user.id, type: "ADJUSTMENT", quantity, balanceAfter: onHand, reason } });
    await tx.auditLog.create({ data: { actorId: context.user.id, action: "inventory.adjust", entityType: "Inventory", entityId: id, before: { onHand: before.onHand }, after: { onHand: inventory.onHand, reason } } });
  }, { isolationLevel: "Serializable" });
  revalidatePath("/admin/inventory");
}

export async function setOrderStatus(formData: FormData) {
  const context = await requirePermission("orders.update");
  const { id, status, note, internalNote } = z.object({ id: z.string().uuid(), status: z.enum(["PAYMENT_VERIFIED", "PROCESSING", "SOURCING_ITEMS", "ITEMS_RECEIVED", "PACKING", "READY_FOR_DELIVERY", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "COMPLETED", "CANCELLED"]), note: z.string().trim().min(3).max(500), internalNote: z.string().trim().max(500).optional() }).parse(Object.fromEntries(formData));
  const refundConfirmed = formData.get("refundConfirmed") === "on";
  if (status === "CANCELLED") {
    await requirePermission("payments.approve");
    if (!refundConfirmed) throw new Error("Confirm the customer refund before cancelling a paid order.");
  }
  const order = await prisma.$transaction(async (tx) => {
    const before = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true, payments: true, convertedQuotation: true } });
    assertOrderTransition(before.status, status);
    if (status === "CANCELLED") {
      for (const item of before.items) {
        if (!item.productId) continue;
        const inventory = await tx.inventory.findFirst({ where: { productId: item.productId, variantId: item.variantId ?? null } });
        if (!inventory) throw new Error(`Reserved stock is inconsistent for ${item.productName}. Cancellation was stopped.`);
        const reserved = reservationAfterRelease(inventory.reserved, item.quantity);
        const updated = await tx.inventory.update({ where: { id: inventory.id }, data: { reserved } });
        await tx.inventoryMovement.create({ data: { inventoryId: inventory.id, actorId: context.user.id, type: "RESERVATION_RELEASE", quantity: -item.quantity, balanceAfter: updated.onHand - updated.reserved, reason: "Paid order cancelled after confirmed refund", referenceType: "Order", referenceId: before.id } });
      }
      await tx.payment.updateMany({ where: { orderId: before.id, status: "PAID" }, data: { status: "REFUNDED" } });
      if (before.convertedQuotation) {
        await tx.quotation.update({ where: { id: before.convertedQuotation.id }, data: { status: "CANCELLED" } });
        await tx.quotationStatusHistory.create({ data: { quotationId: before.convertedQuotation.id, fromStatus: before.convertedQuotation.status, toStatus: "CANCELLED", actorId: context.user.id, note } });
      }
    }
    await tx.order.update({ where: { id }, data: { status, paymentStatus: status === "CANCELLED" ? "REFUNDED" : undefined, completedAt: status === "COMPLETED" ? new Date() : undefined, cancelledAt: status === "CANCELLED" ? new Date() : undefined } });
    await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: before.status, toStatus: status, actorId: context.user.id, note } });
    await tx.deliveryTrackingEvent.create({ data: { orderId: id, status, actorId: context.user.id, publicNote: note, internalNote: internalNote || null } });
    await tx.auditLog.create({ data: { actorId: context.user.id, action: status === "CANCELLED" ? "order.cancel-and-release" : "order.status", entityType: "Order", entityId: id, before: { status: before.status, paymentStatus: before.paymentStatus }, after: { status, note, refundConfirmed: status === "CANCELLED" ? true : undefined } } });
    return tx.order.findUniqueOrThrow({ where: { id }, select: { orderNumber: true, email: true, userId: true } });
  }, { isolationLevel: "Serializable" });
  await enqueueEmail(emailTemplates.orderStatus(order.email, order.orderNumber, status), order.userId ?? undefined);
  revalidatePath("/admin/orders");
}

export async function saveShipmentDetails(formData: FormData) {
  const context = await requirePermission("orders.update");
  const data = z.object({ orderId: z.string().uuid(), deliveryCompany: z.string().trim().min(2).max(160), contactName: z.string().trim().max(120).optional(), contactPhone: z.string().trim().max(40).optional(), trackingNumber: z.string().trim().max(120).optional(), trackingUrl: z.string().url().optional(), estimatedDeliveryAt: z.coerce.date(), deliveryInstructions: z.string().trim().max(2000).optional() }).parse({ ...Object.fromEntries(formData), trackingUrl: formData.get("trackingUrl") || undefined });
  const order = await prisma.order.findUniqueOrThrow({ where: { id: data.orderId }, include: { shipments: { orderBy: { createdAt: "desc" }, take: 1 } } });
  await enqueueEmail(emailTemplates.deliveryScheduled(order.email, order.orderNumber, data.deliveryCompany, data.estimatedDeliveryAt, data.trackingNumber), order.userId??undefined);
  const shipmentData = { deliveryCompany: data.deliveryCompany, contactName: data.contactName||null, contactPhone: data.contactPhone||null, trackingNumber: data.trackingNumber||null, trackingUrl: data.trackingUrl||null, estimatedDeliveryAt: data.estimatedDeliveryAt, deliveryNoteNumber: order.shipments[0]?.deliveryNoteNumber??`DN-${order.orderNumber}`, deliveryInstructions: data.deliveryInstructions||null };
  await prisma.$transaction(async tx=>{if(order.shipments[0])await tx.shipment.update({where:{id:order.shipments[0].id},data:shipmentData});else await tx.shipment.create({data:{orderId:order.id,...shipmentData}});await tx.deliveryTrackingEvent.create({data:{orderId:order.id,status:order.status,actorId:context.user.id,publicNote:`Delivery planned with ${data.deliveryCompany} for ${data.estimatedDeliveryAt.toLocaleString("en-ZA")}.`,internalNote:data.deliveryInstructions||null}});await tx.auditLog.create({data:{actorId:context.user.id,action:"shipment.plan",entityType:"Order",entityId:order.id,after:shipmentData}})});
  revalidatePath(`/admin/orders/${order.id}`);
}

export async function reviewPaymentProof(formData: FormData) {
  const context = await requirePermission("payments.approve");
  const { id, status, note } = z.object({ id: z.string().uuid(), status: z.enum(["APPROVED", "REJECTED"]), note: z.string().max(300).optional() }).parse(Object.fromEntries(formData));
  const proof = await prisma.paymentProof.update({ where: { id }, data: { status, reviewNote: note, reviewerId: context.user.id, reviewedAt: new Date() }, include: { payment: { include: { order: { select: { orderNumber: true, email: true, userId: true } } } } } });
  await audit(context.user.id, `payment-proof.${status.toLowerCase()}`, "PaymentProof", id, { status: "PENDING" }, { status: proof.status, note });
  await enqueueEmail(emailTemplates.paymentReview(proof.payment.order.email, proof.payment.order.orderNumber, status), proof.payment.order.userId ?? undefined);
  revalidatePath("/admin/payments");
}

export async function moderateReview(formData: FormData) {
  const context = await requirePermission("products.update");
  const { id, status } = z.object({ id: z.string().uuid(), status: z.enum(["APPROVED", "REJECTED", "HIDDEN"]) }).parse(Object.fromEntries(formData));
  const review = await prisma.review.update({ where: { id }, data: { status } });
  await audit(context.user.id, "review.moderate", "Review", id, undefined, { status: review.status });
  revalidatePath("/admin/reviews");
}
