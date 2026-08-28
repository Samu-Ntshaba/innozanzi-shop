import { prisma } from "@/lib/prisma";
import type { PaymentEvent } from "@/integrations/payments/provider";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";
import { notifyStaffOfPaidOrder } from "@/domain/notifications/order-alerts";
import { assertPaymentEventMatches } from "@/domain/payments/validation";

export async function processPaymentEvent(provider: "PAYSTACK" | "YOCO", event: PaymentEvent) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { provider_externalReference: { provider, externalReference: event.externalReference } }, include: { order: { include: { items: true, convertedQuotation: true } } } });
    if (!payment) throw new Error("Unknown payment reference");
    if (payment.status === event.status) return { duplicate: true, paymentId: payment.id, order: payment.order, amount: payment.amount.toString() };
    if (payment.status === "PAID") return { duplicate: true, paymentId: payment.id, order: payment.order, amount: payment.amount.toString() };
    assertPaymentEventMatches(event,payment);
    if(event.status==="PAID"){
      for(const item of payment.order.items){
        if(item.sourceType==="SUPPLIER"){
          const source=await tx.supplierCatalogueProduct.findFirst({where:{id:item.sourceId??undefined,active:true}});
          if(!source||source.stock<item.quantity)throw new Error(`Supplier availability changed for paid item ${item.productName}.`);
          continue;
        }
        if(!item.productId)throw new Error(`${item.productName} is not linked to inventory.`);
        const inventory=await tx.inventory.findFirst({where:{productId:item.productId,variantId:item.variantId??null}});
        if(!inventory||inventory.onHand-inventory.reserved<item.quantity)throw new Error(`Insufficient inventory for paid item ${item.productName}.`);
        const updated=await tx.inventory.update({where:{id:inventory.id},data:{reserved:{increment:item.quantity}}});
        await tx.inventoryMovement.create({data:{inventoryId:inventory.id,type:"RESERVATION",quantity:item.quantity,balanceAfter:updated.onHand,reason:`${provider} payment stock reservation`,referenceType:"Order",referenceId:payment.orderId}});
      }
    }
    await tx.payment.update({ where: { id: payment.id }, data: { status: event.status, paidAt: event.status === "PAID" ? new Date() : null, providerMetadata: event.raw as object } });
    const nextOrderStatus = event.status === "PAID" ? "PAYMENT_VERIFIED" : payment.order.status;
    await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: event.status, status: nextOrderStatus } });
    if (event.status === "PAID") {
      await tx.orderStatusHistory.create({ data: { orderId: payment.orderId, fromStatus: payment.order.status, toStatus: "PAYMENT_VERIFIED", note: `${provider} payment verified automatically` } });
      await tx.deliveryTrackingEvent.create({ data: { orderId: payment.orderId, status: "PAYMENT_VERIFIED", publicNote: "Your payment has been confirmed. We are preparing your order for fulfilment.", internalNote: `${provider} webhook ${event.eventId}` } });
      const staff = await tx.user.findMany({ where: { status: "ACTIVE", deletedAt: null, accountType: "INTERNAL_EMPLOYEE" }, select: { id: true } });
      if (staff.length) await tx.notification.createMany({ data: staff.map(({ id }) => ({ userId: id, type: "ORDER_PAID", channel: "IN_APP", subject: `Paid order ${payment.order.orderNumber}`, body: `Payment is verified. Fulfilment must accept order ${payment.order.orderNumber}.`, status: "SENT" as const, sentAt: new Date(), data: { orderId: payment.orderId, orderNumber: payment.order.orderNumber, category: "REQUIRES_ACTION" } })) });
    }
    if(event.status==="PAID"&&payment.order.pcProjectId){
      const sourceIds=payment.order.items.map(item=>item.sourceId).filter((id):id is string=>Boolean(id));
      await tx.pcProjectItem.updateMany({where:{projectId:payment.order.pcProjectId,supplierProductId:{in:sourceIds},purchasedAt:null},data:{purchasedAt:new Date(),orderId:payment.orderId}});
      const required=["cpu","motherboard","memory","storage","power","case"],configured=await tx.pcProjectItem.count({where:{projectId:payment.order.pcProjectId,stepKey:{in:required}}}),remaining=await tx.pcProjectItem.count({where:{projectId:payment.order.pcProjectId,stepKey:{in:required},purchasedAt:null}}),complete=configured===required.length&&remaining===0;
      await tx.pcProject.update({where:{id:payment.order.pcProjectId},data:{status:complete?"COMPLETE":"IN_PROGRESS",completedAt:complete?new Date():null}});
    }
    if(event.status==="PAID"&&payment.order.convertedQuotation)await tx.quotation.update({where:{id:payment.order.convertedQuotation.id},data:{status:"PAYMENT_VERIFIED"}});
    await tx.auditLog.create({ data: { action: "payment.webhook", entityType: "Payment", entityId: payment.id, metadata: { eventId: event.eventId, provider } } });
    return { duplicate: false, paymentId: payment.id, order: payment.order, amount: payment.amount.toString() };
  });
  if (!result.duplicate && event.status === "PAID") await Promise.all([enqueueEmail(emailTemplates.paymentReceived(result.order.email, result.order.orderNumber, result.amount), result.order.userId ?? undefined),notifyStaffOfPaidOrder(result.order.id)]);
  return { duplicate: result.duplicate, paymentId: result.paymentId };
}
