import { prisma } from "@/lib/prisma";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";
export async function sendPaidOrderConfirmation(orderId: string) { const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: { select: { productName: true, quantity: true, lineTotal: true } } } }); if (!order) return; await enqueueEmail(emailTemplates.orderConfirmation(order.email, order.orderNumber, order.grandTotal.toString(), order.items.map(item => ({ name: item.productName, quantity: item.quantity, total: item.lineTotal.toString() }))), order.userId ?? undefined); }
