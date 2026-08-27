import { prisma } from "@/lib/prisma";

const requiredKeys=["cpu","motherboard","memory","storage","power","case"];

export async function reconcilePcProjectPurchases(projectId:string){
  const orders=await prisma.order.findMany({where:{pcProjectId:projectId,paymentStatus:"PAID"},include:{items:true}}),paid=orders.flatMap(order=>order.items.map(item=>({orderId:order.id,sourceId:item.sourceId,price:item.unitPrice})));
  for(const item of paid){if(item.sourceId)await prisma.pcProjectItem.updateMany({where:{projectId,supplierProductId:item.sourceId,purchasedAt:null},data:{purchasedAt:new Date(),purchasedPrice:item.price,orderId:item.orderId}})}
  const configured=await prisma.pcProjectItem.count({where:{projectId,stepKey:{in:requiredKeys}}}),remaining=await prisma.pcProjectItem.count({where:{projectId,stepKey:{in:requiredKeys},purchasedAt:null}}),purchased=await prisma.pcProjectItem.count({where:{projectId,purchasedAt:{not:null}}}),complete=configured===requiredKeys.length&&remaining===0;
  await prisma.pcProject.update({where:{id:projectId},data:{status:complete?"COMPLETE":purchased?"IN_PROGRESS":configured===requiredKeys.length?"READY_TO_BUILD":"PLANNING",completedAt:complete?new Date():null}});
}
