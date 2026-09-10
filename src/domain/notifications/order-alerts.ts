import { prisma } from "@/lib/prisma";
import { emailTemplates } from "@/integrations/email/templates";
import { sendStaffEmail } from "./role-email";
import { supplierOrderRequestPdf } from "@/domain/orders/supplier-order-document";
import { sendPaidOrderConfirmation } from "@/domain/notifications/customer-order";

export async function notifyStaffOfPaidOrder(orderId:string) {
  const order=await prisma.order.findUnique({where:{id:orderId},include:{items:{select:{productName:true,sku:true,supplierSku:true,sourceType:true,quantity:true,lineTotal:true,costPrice:true,supplierId:true}},addresses:{where:{type:{in:["DELIVERY","BOTH"]}},take:1}}});
  if(!order)return;
  const supplierIds=[...new Set(order.items.map(item=>item.supplierId).filter((id):id is string=>Boolean(id)))],suppliers=await prisma.supplier.findMany({where:{id:{in:supplierIds}},select:{id:true,companyName:true}}),names=new Map(suppliers.map(item=>[item.id,item.companyName]));
  const supplierItems=order.items.filter(item=>item.sourceType==="SUPPLIER"||item.supplierId);
  const message=emailTemplates.paidOrderInternal({id:order.id,number:order.orderNumber,email:order.email,phone:order.phone,total:order.grandTotal.toString(),paymentMethod:order.paymentMethod,placedAt:order.placedAt??order.createdAt,address:order.addresses[0]?`${order.addresses[0].recipient}, ${order.addresses[0].line1}, ${order.addresses[0].city}, ${order.addresses[0].province}, ${order.addresses[0].postalCode}`:"No delivery address recorded",items:order.items.map(item=>({name:item.productName,sku:item.supplierSku??item.sku,supplier:item.supplierId?names.get(item.supplierId)??"Unknown distributor":"Innozanzi stock",quantity:item.quantity,total:item.lineTotal.toString()}))});
  if(supplierItems.length){const address=order.addresses[0],groups=new Map<string,typeof supplierItems>();for(const item of supplierItems){const key=item.supplierId??"unknown",group=groups.get(key)??[];group.push(item);groups.set(key,group);}message.attachments=await Promise.all([...groups.entries()].map(async([supplierId,items])=>{const supplierName=supplierId==="unknown"?"Supplier":names.get(supplierId)??"Supplier",pdf=await supplierOrderRequestPdf({orderNumber:order.orderNumber,createdAt:order.createdAt,customer:order.companyName??order.email,deliveryAddress:address?`${address.recipient}, ${address.line1}, ${address.city}, ${address.province}, ${address.postalCode}`:undefined,items:items.map(item=>({name:item.productName,sku:item.supplierSku??item.sku,quantity:item.quantity,costPrice:item.costPrice?.toString()??null,supplierName}))});return{filename:`Supplier-Purchase-Order-${order.orderNumber}-${supplierName.replace(/[^a-z0-9]+/gi,"-")}.pdf`,content:pdf,contentType:"application/pdf"};}));}
  await Promise.all([sendPaidOrderConfirmation(orderId),sendStaffEmail("ORDER_PAID",message)]);
}
