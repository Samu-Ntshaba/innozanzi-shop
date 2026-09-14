import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";

// Runs from the durable paid-order task; deterministic numbering and the order lock
// prevent a repeated callback or worker retry from creating a second invoice.
export async function ensurePaidOrderInvoice(orderId:string){
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId}::uuid FOR UPDATE`;
  const order=await tx.order.findUniqueOrThrow({where:{id:orderId},include:{items:true,addresses:true,payments:{where:{status:"PAID"}},invoices:{where:{status:{notIn:["VOID","CANCELLED"]}}}}});
  if(order.paymentStatus!=="PAID")return null;
  if(order.invoices.length)return order.invoices[0];
  const payment=order.payments[0];
  if(!payment?.paidAt||!payment.amount.equals(order.grandTotal))throw new Error("Invoice requires a matching verified payment.");
  const address=order.addresses.find(a=>a.type==="BILLING"||a.type==="BOTH")??order.addresses[0];
  const items=order.items.map((item,sortOrder)=>({description:item.productName,quantity:item.quantity,
    unitPrice:item.unitPrice.div(new Decimal(1).plus(item.vatRate)),vatRate:item.vatRate.mul(100),vatTotal:item.vatTotal,
    lineTotal:item.lineTotal,sortOrder,isTestData:order.isTestData}));
  if(order.deliveryTotal.gt(0)){
   const deliveryVat=order.vatTotal.minus(order.items.reduce((sum,item)=>sum.plus(item.vatTotal),new Decimal(0))).toDecimalPlaces(2);
   items.push({description:"Delivery",quantity:1,unitPrice:order.deliveryTotal,vatRate:deliveryVat.div(order.deliveryTotal).mul(100),vatTotal:deliveryVat,lineTotal:order.deliveryTotal.plus(deliveryVat),sortOrder:items.length,isTestData:order.isTestData});
  }
  return tx.invoice.create({data:{invoiceNumber:`INV-${order.orderNumber}`,orderId:order.id,origin:"AUTOMATED",status:"PAID",
    customerName:address?.recipient??order.email,customerEmail:order.email,companyName:order.companyName,
    billingAddress:address?[address.line1,address.line2,address.suburb,address.city,address.province,address.postalCode].filter(Boolean).join(", "):null,
    currency:order.currency,subtotal:order.subtotal.plus(order.deliveryTotal),discountTotal:order.discountTotal,vatTotal:order.vatTotal,grandTotal:order.grandTotal,
    amountPaid:order.grandTotal,balanceDue:0,issuedAt:payment.paidAt,paidAt:payment.paidAt,dueAt:payment.paidAt,
    notes:`Payment received for order ${order.orderNumber}. Prices include any applied discounts.`,isTestData:order.isTestData,
    items:{create:items},payments:{create:{amount:payment.amount,method:payment.provider,reference:payment.externalReference,paidAt:payment.paidAt,isTestData:order.isTestData}},
  }});
 });
}
