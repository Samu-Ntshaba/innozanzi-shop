import { prisma } from "@/lib/prisma";
import { emailTemplates } from "@/integrations/email/templates";
import { sendStaffEmail } from "./role-email";

export async function notifyStaffOfPaidOrder(orderId:string) {
  const order=await prisma.order.findUnique({where:{id:orderId},include:{items:{select:{productName:true,sku:true,supplierSku:true,sourceType:true,quantity:true,lineTotal:true}},addresses:{where:{type:{in:["DELIVERY","BOTH"]}},take:1}}});
  if(!order)return;
  await sendStaffEmail("ORDER_PAID",emailTemplates.paidOrderInternal({id:order.id,number:order.orderNumber,email:order.email,phone:order.phone,total:order.grandTotal.toString(),paymentMethod:order.paymentMethod,placedAt:order.placedAt??order.createdAt,address:order.addresses[0]?`${order.addresses[0].recipient}, ${order.addresses[0].line1}, ${order.addresses[0].city}, ${order.addresses[0].province}, ${order.addresses[0].postalCode}`:"No delivery address recorded",items:order.items.map(item=>({name:item.productName,sku:item.supplierSku??item.sku,source:item.sourceType,quantity:item.quantity,total:item.lineTotal.toString()}))}));
}
