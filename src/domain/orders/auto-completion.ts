import { prisma } from "@/lib/prisma";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";
import { orderCompletionWindowDays, returnWindowEnd } from "@/domain/orders/settings";

export async function completeDeliveredOrders(now = new Date()) {
  const days = await orderCompletionWindowDays();
  const candidates = await prisma.order.findMany({ where: { status: "DELIVERED", returnCases: { none: { status: { notIn: ["RESOLVED", "REJECTED", "CLOSED"] } } } }, include: { shipments: { where: { deliveredAt: { not: null } }, orderBy: { deliveredAt: "desc" }, take: 1 } }, take: 200 });
  let completed = 0;
  for (const order of candidates) {
    const deliveredAt = order.shipments[0]?.deliveredAt;
    if (!deliveredAt || returnWindowEnd(deliveredAt, days) > now) continue;
    const changed = await prisma.$transaction(async tx => {
      const current = await tx.order.findUnique({ where: { id: order.id }, include: { returnCases: { where: { status: { notIn: ["RESOLVED", "REJECTED", "CLOSED"] } }, take: 1 } } });
      if (!current || current.status !== "DELIVERED" || current.returnCases.length) return false;
      await tx.order.update({ where: { id: order.id }, data: { status: "COMPLETED", completedAt: now } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: "DELIVERED", toStatus: "COMPLETED", note: `Closed automatically ${days} days after delivery with no open return request.` } });
      await tx.deliveryTrackingEvent.create({ data: { orderId: order.id, status: "COMPLETED", publicNote: "Your return window has ended and this order is now complete." } });
      await tx.auditLog.create({ data: { action: "order.auto-complete", entityType: "Order", entityId: order.id, before: { status: "DELIVERED" }, after: { status: "COMPLETED", completionWindowDays: days } } });
      return true;
    }, { isolationLevel: "Serializable" });
    if (changed) { await enqueueEmail(emailTemplates.orderStatus(order.email, order.orderNumber, "COMPLETED"), order.userId ?? undefined); completed += 1; }
  }
  return { checked: candidates.length, completed, completionWindowDays: days };
}
