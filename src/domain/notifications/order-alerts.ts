import { prisma } from "@/lib/prisma";
import { emailTemplates } from "@/integrations/email/templates";
import { sendStaffEmail } from "./role-email";
import { supplierOrderRequestPdf } from "@/domain/orders/supplier-order-document";

export async function notifyStaffOfPaidOrder(orderId:string) {
  const order=await prisma.order.findUnique({where:{id:orderId},include:{items:{select:{productName:true,sku:true,supplierSku:true,sourceType:true,quantity:true,lineTotal:true,costPrice:true,supplierId:true}},addresses:{where:{type:{in:["DELIVERY","BOTH"]}},take:1}}});
  if(!order)return;
  const supplierIds=[...new Set(order.items.map(item=>item.supplierId).filter((id):id is string=>Boolean(id)))],suppliers=await prisma.supplier.findMany({where:{id:{in:supplierIds}},select:{id:true,companyName:true}}),names=new Map(suppliers.map(item=>[item.id,item.companyName]));
  const supplierItems=order.items.filter(item=>item.sourceType==="SUPPLIER"||item.supplierId);
  const message=emailTemplates.paidOrderInternal({id:order.id,number:order.orderNumber,email:order.email,phone:order.phone,total:order.grandTotal.toString(),paymentMethod:order.paymentMethod,placedAt:order.placedAt??order.createdAt,address:order.addresses[0]?`${order.addresses[0].recipient}, ${order.addresses[0].line1}, ${order.addresses[0].city}, ${order.addresses[0].province}, ${order.addresses[0].postalCode}`:"No delivery address recorded",items:order.items.map(item=>({name:item.productName,sku:item.supplierSku??item.sku,source:item.sourceType,quantity:item.quantity,total:item.lineTotal.toString()}))});
  if(supplierItems.length){const pdf=await supplierOrderRequestPdf({orderNumber:order.orderNumber,createdAt:order.createdAt,items:supplierItems.map(item=>({name:item.productName,sku:item.supplierSku??item.sku,quantity:item.quantity,costPrice:item.costPrice?.toString()??null,supplierName:item.supplierId?names.get(item.supplierId)??"Supplier":"Supplier"}))});message.attachments=[{filename:`Supplier-Order-${order.orderNumber}.pdf`,content:pdf,contentType:"application/pdf"}]}
  await sendStaffEmail("ORDER_PAID",message);
}
