"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { actualCostSchema,reconciledProfit } from "./reconciliation";
import { evaluateCommissionInTransaction } from "@/domain/partner-sales/commission-service";
export async function reconcileOrderCosts(form:FormData){
 const ctx=await requirePermission("payments.approve");
 const input=z.object({orderId:z.string().uuid(),note:z.string().trim().min(10).max(1000),complete:z.literal("on")}).parse(Object.fromEntries(form));
 const costs=actualCostSchema.parse(Object.fromEntries(form));
 await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId}::uuid FOR UPDATE`;
  const order=await tx.order.findUniqueOrThrow({where:{id:input.orderId}});
  if(order.paymentStatus!=="PAID"||!["DELIVERED","COMPLETED"].includes(order.status))throw new Error("Reconcile delivered paid orders only. Refund cases use the returns reconciliation workflow.");
  const result=reconciledProfit(order.grandTotal,order.vatTotal,costs);
  await tx.auditLog.create({data:{actorId:ctx.user.id,action:"order.economics.reconcile",entityType:"Order",entityId:order.id,after:result,metadata:{note:input.note,orderNumber:order.orderNumber,excludesSubsequentRefunds:true}}});
  const partnerCommission = (tx as unknown as { partnerCommission?: { findUnique: (args: unknown) => Promise<{ id: string } | null> } }).partnerCommission;
  if (partnerCommission) {
   const linked = await partnerCommission.findUnique({ where: { orderId: order.id }, select: { id: true } });
   if (linked) await evaluateCommissionInTransaction(tx, order.id, ctx.user.id);
  }
 });
 revalidatePath(`/admin/orders/${input.orderId}`);
}
