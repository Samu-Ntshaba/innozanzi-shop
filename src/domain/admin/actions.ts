"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/domain/auth/session";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";
import { notifyStaffOfPaidOrder } from "@/domain/notifications/order-alerts";
import { assertOrderTransition, assertOrderTransitionRequirements, reservationAfterRelease } from "@/domain/orders/lifecycle";
import { categoryIconOptions } from "@/components/store/category-icon";

const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const text = z.string().trim().min(1).max(200);
const categorySchema = z.object({
  name: text,
  slug: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  iconKey: z.string().refine(value => categoryIconOptions.some(([key]) => key === value), "Choose a valid category icon."),
  displayOrder: z.coerce.number().int().min(0).max(10000).default(0),
});

const refreshCategories = (slug?: string) => {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/categories");
  revalidatePath("/admin/categories");
  if (slug) revalidatePath(`/categories/${slug}`);
};

async function audit(actorId: string, action: string, entityType: string, entityId: string, before: unknown, after: unknown) {
  await prisma.auditLog.create({ data: { actorId, action, entityType, entityId, before: before as object | undefined, after: after as object | undefined } });
}

export async function createCategory(formData: FormData) {
  const context = await requirePermission("products.update");
  const data = categorySchema.parse(Object.fromEntries(formData));
  const slug = slugify(data.slug || data.name);
  const category = await prisma.category.create({ data: { name: data.name, slug, description: data.description || null, imagePath: `icon:${data.iconKey}`, displayOrder: data.displayOrder } });
  await audit(context.user.id, "category.create", "Category", category.id, undefined, { name: category.name, slug: category.slug, icon: category.imagePath });
  refreshCategories(category.slug);
}

export async function updateCategory(formData: FormData) {
  const context = await requirePermission("products.update");
  const data = categorySchema.extend({ id: z.string().uuid(), isActive: z.string().optional() }).parse(Object.fromEntries(formData));
  const before = await prisma.category.findUniqueOrThrow({ where: { id: data.id } });
  const slug = slugify(data.slug || data.name);
  const category = await prisma.category.update({ where: { id: data.id }, data: { name: data.name, slug, description: data.description || null, imagePath: `icon:${data.iconKey}`, displayOrder: data.displayOrder, isActive: data.isActive === "on" } });
  await audit(context.user.id, "category.update", "Category", category.id, { name: before.name, slug: before.slug, icon: before.imagePath, isActive: before.isActive }, { name: category.name, slug: category.slug, icon: category.imagePath, isActive: category.isActive });
  refreshCategories(before.slug);
  refreshCategories(category.slug);
}

export async function deleteCategory(formData: FormData) {
  const context = await requirePermission("products.update");
  const id = z.string().uuid().parse(formData.get("id"));
  const category = await prisma.category.findUniqueOrThrow({ where: { id }, include: { _count: { select: { products: true, children: true, couponCategories: true } } } });
  const hasDependencies = category._count.products > 0 || category._count.children > 0 || category._count.couponCategories > 0;
  if (hasDependencies) {
    await prisma.category.update({ where: { id }, data: { isActive: false } });
    await audit(context.user.id, "category.deactivate", "Category", id, { isActive: category.isActive }, { isActive: false, reason: "Category has linked records" });
  } else {
    await prisma.category.delete({ where: { id } });
    await audit(context.user.id, "category.delete", "Category", id, { name: category.name, slug: category.slug }, undefined);
  }
  refreshCategories(category.slug);
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
    const before = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true, payments: true, shipments: { take: 1 }, convertedQuotation: true } });
    assertOrderTransition(before.status, status);
    assertOrderTransitionRequirements({ from: before.status, to: status, hasSupplierItems: before.items.some(item => item.sourceType === "SUPPLIER" || Boolean(item.supplierId)), hasShipment: before.shipments.length > 0 });
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
    const transitionTime = new Date();
    await tx.order.update({ where: { id }, data: { status, paymentStatus: status === "CANCELLED" ? "REFUNDED" : undefined, completedAt: status === "COMPLETED" ? transitionTime : undefined, cancelledAt: status === "CANCELLED" ? transitionTime : undefined } });
    if (status === "DELIVERED" && before.shipments[0]) await tx.shipment.update({ where: { id: before.shipments[0].id }, data: { status: "DELIVERED", deliveredAt: transitionTime } });
    if (["DISPATCHED", "IN_TRANSIT"].includes(status) && before.shipments[0]) await tx.shipment.update({ where: { id: before.shipments[0].id }, data: { status: "IN_TRANSIT", shippedAt: status === "DISPATCHED" ? transitionTime : undefined } });
    await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: before.status, toStatus: status, actorId: context.user.id, note } });
    await tx.deliveryTrackingEvent.create({ data: { orderId: id, status, actorId: context.user.id, publicNote: note, internalNote: internalNote || null } });
    await tx.auditLog.create({ data: { actorId: context.user.id, action: status === "CANCELLED" ? "order.cancel-and-release" : "order.status", entityType: "Order", entityId: id, before: { status: before.status, paymentStatus: before.paymentStatus }, after: { status, note, refundConfirmed: status === "CANCELLED" ? true : undefined } } });
    return tx.order.findUniqueOrThrow({ where: { id }, select: { orderNumber: true, email: true, userId: true } });
  }, { isolationLevel: "Serializable" });
  await enqueueEmail(emailTemplates.orderStatus(order.email, order.orderNumber, status), order.userId ?? undefined);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath(`/account/orders/${order.orderNumber}`);
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
  const proof = await prisma.$transaction(async tx=>{const current=await tx.paymentProof.findUniqueOrThrow({where:{id},include:{payment:{include:{order:{include:{items:true}}}}}});if(current.status!=="PENDING")throw new Error("This proof has already been reviewed.");if(status==="APPROVED"){for(const item of current.payment.order.items){if(!item.productId)continue;const inventory=await tx.inventory.findFirst({where:{productId:item.productId,variantId:item.variantId??null}});if(!inventory||inventory.onHand-inventory.reserved<item.quantity)throw new Error(`Insufficient stock for ${item.productName}. Payment approval was stopped.`);const updated=await tx.inventory.update({where:{id:inventory.id},data:{reserved:{increment:item.quantity}}});await tx.inventoryMovement.create({data:{inventoryId:inventory.id,actorId:context.user.id,type:"RESERVATION",quantity:item.quantity,balanceAfter:updated.onHand-updated.reserved,reason:"Approved EFT payment",referenceType:"Order",referenceId:current.payment.orderId}})}await tx.payment.update({where:{id:current.paymentId},data:{status:"PAID",paidAt:new Date()}});await tx.order.update({where:{id:current.payment.orderId},data:{status:"PAYMENT_VERIFIED",paymentStatus:"PAID"}});await tx.orderStatusHistory.create({data:{orderId:current.payment.orderId,fromStatus:current.payment.order.status,toStatus:"PAYMENT_VERIFIED",actorId:context.user.id,note:note||"EFT proof approved"}});await tx.deliveryTrackingEvent.create({data:{orderId:current.payment.orderId,status:"PAYMENT_VERIFIED",actorId:context.user.id,publicNote:"Your payment has been confirmed. We are preparing your order for fulfilment.",internalNote:note||"EFT proof approved"}})}else{await tx.payment.update({where:{id:current.paymentId},data:{status:"PENDING"}});await tx.order.update({where:{id:current.payment.orderId},data:{status:"AWAITING_PAYMENT",paymentStatus:"PENDING"}});await tx.deliveryTrackingEvent.create({data:{orderId:current.payment.orderId,status:"AWAITING_PAYMENT",actorId:context.user.id,publicNote:"Your proof of payment needs attention. Please review the payment email and submit a valid proof.",internalNote:note||"EFT proof rejected"}})}return tx.paymentProof.update({where:{id},data:{status,reviewNote:note,reviewerId:context.user.id,reviewedAt:new Date()},include:{payment:{include:{order:{select:{orderNumber:true,email:true,userId:true}}}}}})} ,{isolationLevel:"Serializable"});
  await audit(context.user.id, `payment-proof.${status.toLowerCase()}`, "PaymentProof", id, { status: "PENDING" }, { status: proof.status, note });
  await enqueueEmail(status==="APPROVED"?emailTemplates.paymentReceived(proof.payment.order.email,proof.payment.order.orderNumber,proof.payment.amount.toString()):emailTemplates.paymentReview(proof.payment.order.email, proof.payment.order.orderNumber, status), proof.payment.order.userId ?? undefined);
  if(status==="APPROVED")await notifyStaffOfPaidOrder(proof.payment.orderId);
  revalidatePath("/admin/payments");
  revalidatePath(`/account/orders/${proof.payment.order.orderNumber}`);
}

export async function moderateReview(formData: FormData) {
  const context = await requirePermission("products.update");
  const { id, status } = z.object({ id: z.string().uuid(), status: z.enum(["APPROVED", "REJECTED", "HIDDEN"]) }).parse(Object.fromEntries(formData));
  const review = await prisma.review.update({ where: { id }, data: { status } });
  await audit(context.user.id, "review.moderate", "Review", id, undefined, { status: review.status });
  revalidatePath("/admin/reviews");
}
