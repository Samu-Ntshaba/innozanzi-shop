import { prisma } from "@/lib/prisma";
import type { PaymentEvent } from "@/integrations/payments/provider";
import { notifyStaffOfPaidOrder } from "@/domain/notifications/order-alerts";
import { assertPaymentEventMatches } from "@/domain/payments/validation";

export async function processPaymentEvent(provider: "PAYSTACK" | "YOCO" | "OZOW" | "PAYFAST", event: PaymentEvent) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { provider_externalReference: { provider, externalReference: event.externalReference } }, include: { order: { include: { items: true, convertedQuotation: true } } } });
    if (!payment) throw new Error("Unknown payment reference");
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${payment.orderId}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${payment.id}::uuid FOR UPDATE`;
    const latest=await tx.payment.findUniqueOrThrow({where:{id:payment.id}});
    assertPaymentEventMatches(event,payment);
    if(provider==="OZOW"||provider==="PAYFAST"){
      if(!event.amount||event.currency!=="ZAR")throw new Error("Missing verified amount or currency");
      const duplicate=await tx.gatewayEvent.findUnique({where:{provider_eventId:{provider,eventId:event.eventId}}});
      if(duplicate&&duplicate.paymentId!==payment.id)throw new Error("Gateway event reference conflict");
      if(duplicate||latest.status==="PAID")return {duplicate:true,paymentId:payment.id,order:payment.order,amount:payment.amount.toString()};
      await tx.gatewayEvent.create({data:{provider,eventId:event.eventId,paymentId:payment.id}});
    }
    if (latest.status === event.status) return { duplicate: true, paymentId: payment.id, order: payment.order, amount: payment.amount.toString() };
    if (payment.status === "PAID") return { duplicate: true, paymentId: payment.id, order: payment.order, amount: payment.amount.toString() };
    assertPaymentEventMatches(event,payment);
    if(event.status==="PAID"){
      const otherCapture=await tx.payment.findFirst({where:{orderId:payment.orderId,status:"PAID",id:{not:payment.id}}});
      if(otherCapture){
        await tx.payment.update({where:{id:payment.id},data:{status:"PAID",paidAt:new Date(),providerMetadata:event.raw as object,failureReason:"Duplicate payment captured after another order payment was verified; finance refund review required."}});
        const staff=await tx.user.findMany({where:{status:"ACTIVE",deletedAt:null,accountType:"INTERNAL_EMPLOYEE"},select:{id:true}});
        if(staff.length)await tx.notification.createMany({data:staff.map(({id})=>({userId:id,type:"PAYMENT_EXCEPTION",channel:"IN_APP",subject:`Duplicate payment for ${payment.order.orderNumber}`,body:"A second payment was captured for an already-paid order. Finance must review and refund the duplicate.",status:"SENT" as const,sentAt:new Date(),data:{orderId:payment.orderId,paymentId:payment.id,category:"REQUIRES_ACTION"}}))});
        await tx.auditLog.create({data:{action:"payment.duplicate-capture",entityType:"Payment",entityId:payment.id,metadata:{eventId:event.eventId,provider,existingPaymentId:otherCapture.id}}});
        return{duplicate:true,paymentId:payment.id,order:payment.order,amount:payment.amount.toString()};
      }
    }
    let stockIssue=false;
    if(event.status==="PAID"){
      for(const item of payment.order.items){
        if(item.sourceType==="SUPPLIER"){
          const source=await tx.supplierCatalogueProduct.findFirst({where:{id:item.sourceId??undefined,active:true}});
          if(!source||source.stock<item.quantity)stockIssue=true;
          continue;
        }
        if(!item.productId){stockIssue=true;continue;}
        const inventory=await tx.inventory.findFirst({where:{productId:item.productId,variantId:item.variantId??null}});
        if(!inventory||inventory.onHand-inventory.reserved<item.quantity){stockIssue=true;continue;}
        const reserved=await tx.$queryRaw<Array<{onHand:number}>>`UPDATE "Inventory" SET "reserved"="reserved"+${item.quantity} WHERE id=${inventory.id}::uuid AND "onHand"-"reserved">=${item.quantity} RETURNING "onHand"`;
        if(!reserved.length){stockIssue=true;continue;}
        const updated=reserved[0];
        await tx.inventoryMovement.create({data:{inventoryId:inventory.id,type:"RESERVATION",quantity:item.quantity,balanceAfter:updated.onHand,reason:`${provider} payment stock reservation`,referenceType:"Order",referenceId:payment.orderId}});
      }
    }
    await tx.payment.update({ where: { id: payment.id }, data: { status: event.status, paidAt: event.status === "PAID" ? new Date() : null, providerMetadata: event.raw as object } });
    const nextOrderStatus = event.status === "PAID" ? "PAYMENT_VERIFIED" : payment.order.status;
    const newerActiveAttempt = event.status === "PAID" ? null : await tx.payment.findFirst({
      where: {
        orderId: payment.orderId,
        id: { not: payment.id },
        createdAt: { gt: payment.createdAt },
        status: { in: ["PENDING", "AWAITING_REVIEW", "PAID"] },
      },
      select: { id: true },
    });
    if (!newerActiveAttempt) {
      await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: event.status, status: nextOrderStatus } });
    }
    if (event.status === "PAID") {
      await tx.orderStatusHistory.create({ data: { orderId: payment.orderId, fromStatus: payment.order.status, toStatus: "PAYMENT_VERIFIED", note: stockIssue?`${provider} payment received; stock exception requires procurement review`:`${provider} payment confirmed; settlement and procurement require separate review` } });
      await tx.deliveryTrackingEvent.create({ data: { orderId: payment.orderId, status: "PAYMENT_VERIFIED", publicNote: "Your payment has been confirmed. We are preparing your order for fulfilment.", internalNote: `${provider} webhook ${event.eventId}` } });
      const staff = await tx.user.findMany({ where: { status: "ACTIVE", deletedAt: null, accountType: "INTERNAL_EMPLOYEE" }, select: { id: true } });
      if (staff.length) await tx.notification.createMany({ data: staff.map(({ id }) => ({ userId: id, type: "ORDER_PAID", channel: "IN_APP", subject: `Paid order ${payment.order.orderNumber}`, body: `Payment is verified. Fulfilment must accept order ${payment.order.orderNumber}.`, status: "SENT" as const, sentAt: new Date(), data: { orderId: payment.orderId, orderNumber: payment.order.orderNumber, category: "REQUIRES_ACTION" } })) });
      if(payment.order.aiRecommendationId){await tx.aIUsage.updateMany({where:{recommendationId:payment.order.aiRecommendationId},data:{orderId:payment.orderId}});await tx.recommendationEvent.create({data:{userId:payment.order.userId,sessionId:payment.order.userId?`user:${payment.order.userId}`:`order:${payment.orderId}`,eventType:"AI_ORDER_COMPLETED",entityType:"ORDER",entityId:payment.orderId,recommendationId:payment.order.aiRecommendationId,context:"payment"}})}
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
  if (!result.duplicate && event.status === "PAID") await notifyStaffOfPaidOrder(result.order.id);
  return { duplicate: result.duplicate, paymentId: result.paymentId };
}
