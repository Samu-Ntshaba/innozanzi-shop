import { prisma } from "@/lib/prisma";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";
export async function sendPaidOrderConfirmation(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: { select: { name: true } }, items: { select: { productName: true, quantity: true, lineTotal: true } } } });
  if (!order || order.paymentStatus !== "PAID") return;
  await enqueueEmail(emailTemplates.orderConfirmation(order.email, order.user?.name??"Customer", order.orderNumber, order.grandTotal.toString(), order.items.map(item => ({ name: item.productName, quantity: item.quantity, total: item.lineTotal.toString() }))), order.userId ?? undefined);
  // Automatic acceptance is a distinct customer event. Stable template keys
  // make both this message and the confirmation safe to retry.
  if(order.status === "PROCESSING")await enqueueEmail(emailTemplates.orderStatus(order.email,order.orderNumber,"PROCESSING"),order.userId??undefined);
}
