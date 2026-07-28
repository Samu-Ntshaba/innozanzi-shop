import { prisma } from "@/lib/prisma";
import type { PaymentEvent } from "@/integrations/payments/provider";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";

export async function processPaymentEvent(provider: "PAYSTACK" | "YOCO", event: PaymentEvent) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { provider_externalReference: { provider, externalReference: event.externalReference } }, include: { order: { include: { items: true, convertedQuotation: true } } } });
    if (!payment) throw new Error("Unknown payment reference");
    if (payment.status === event.status) return { duplicate: true, paymentId: payment.id, order: payment.order, amount: payment.amount.toString() };
    if (payment.status === "PAID") return { duplicate: true, paymentId: payment.id, order: payment.order, amount: payment.amount.toString() };
    if (event.amount && Number(event.amount) !== Number(payment.amount)) throw new Error("Payment amount mismatch");
    if(event.status==="PAID"){
      for(const item of payment.order.items){
        if(!item.productId)throw new Error(`${item.productName} is not linked to inventory.`);
        const inventory=await tx.inventory.findFirst({where:{productId:item.productId,variantId:item.variantId??null}});
        if(!inventory||inventory.onHand-inventory.reserved<item.quantity)throw new Error(`Insufficient inventory for paid item ${item.productName}.`);
        const updated=await tx.inventory.update({where:{id:inventory.id},data:{reserved:{increment:item.quantity}}});
        await tx.inventoryMovement.create({data:{inventoryId:inventory.id,type:"RESERVATION",quantity:item.quantity,balanceAfter:updated.onHand,reason:"Paystack payment stock reservation",referenceType:"Order",referenceId:payment.orderId}});
      }
    }
    await tx.payment.update({ where: { id: payment.id }, data: { status: event.status, paidAt: event.status === "PAID" ? new Date() : null, providerMetadata: event.raw as object } });
    await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: event.status, status: event.status === "PAID" ? "PAID" : payment.order.status } });
    if(event.status==="PAID"&&payment.order.convertedQuotation)await tx.quotation.update({where:{id:payment.order.convertedQuotation.id},data:{status:"PAYMENT_VERIFIED"}});
    await tx.auditLog.create({ data: { action: "payment.webhook", entityType: "Payment", entityId: payment.id, metadata: { eventId: event.eventId, provider } } });
    return { duplicate: false, paymentId: payment.id, order: payment.order, amount: payment.amount.toString() };
  });
  if (!result.duplicate && event.status === "PAID") await enqueueEmail(emailTemplates.paymentReceived(result.order.email, result.order.orderNumber, result.amount), result.order.userId ?? undefined);
  return { duplicate: result.duplicate, paymentId: result.paymentId };
}
