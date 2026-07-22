import { prisma } from "@/lib/prisma";
import type { PaymentEvent } from "@/integrations/payments/provider";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";

export async function processPaymentEvent(provider: "PAYSTACK" | "YOCO", event: PaymentEvent) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { provider_externalReference: { provider, externalReference: event.externalReference } }, include: { order: true } });
    if (!payment) throw new Error("Unknown payment reference");
    if (payment.status === event.status) return { duplicate: true, paymentId: payment.id, order: payment.order, amount: payment.amount.toString() };
    if (payment.status === "PAID") return { duplicate: true, paymentId: payment.id, order: payment.order, amount: payment.amount.toString() };
    if (event.amount && Number(event.amount) !== Number(payment.amount)) throw new Error("Payment amount mismatch");
    await tx.payment.update({ where: { id: payment.id }, data: { status: event.status, paidAt: event.status === "PAID" ? new Date() : null, providerMetadata: event.raw as object } });
    await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: event.status, status: event.status === "PAID" ? "PAID" : payment.order.status } });
    await tx.auditLog.create({ data: { action: "payment.webhook", entityType: "Payment", entityId: payment.id, metadata: { eventId: event.eventId, provider } } });
    return { duplicate: false, paymentId: payment.id, order: payment.order, amount: payment.amount.toString() };
  });
  if (!result.duplicate && event.status === "PAID") await enqueueEmail(emailTemplates.paymentReceived(result.order.email, result.order.orderNumber, result.amount), result.order.userId ?? undefined);
  return { duplicate: result.duplicate, paymentId: result.paymentId };
}
