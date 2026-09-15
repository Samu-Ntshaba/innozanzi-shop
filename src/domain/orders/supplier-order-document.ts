import Decimal from "decimal.js";
import { commercialPdf } from "@/domain/documents/commercial-pdf";
import { getDocumentBranding } from "@/domain/documents/branding";

export type SupplierOrderDocument = {
  orderNumber:string;
  createdAt:Date;
  customer?:string;
  recipient?:string;
  phone?:string;
  deliveryAddress?:string;
  deliveryInstructions?:string;
  items:Array<{name:string;sku:string;quantity:number;costPrice:string|null;supplierName:string}>;
};

const money=(value:Decimal.Value)=>`R ${new Decimal(value).toFixed(2)}`;

export async function supplierOrderRequestPdf(order:SupplierOrderDocument){
  const branding=await getDocumentBranding();
  const supplierItems=order.items;
  const total=supplierItems.reduce((sum,item)=>item.costPrice===null?sum:sum.plus(new Decimal(item.costPrice).mul(item.quantity)),new Decimal(0));
  const suppliers=[...new Set(supplierItems.map(item=>item.supplierName))];
  return commercialPdf({
    title:"SUPPLIER PURCHASE ORDER",
    number:`PROC-${order.orderNumber}`,
    customer:suppliers.join(", ")||"Supplier to confirm",
    email:branding.email,
    issueDate:new Date(),
    reference:order.orderNumber,
    lines:supplierItems.map(item=>({description:`${item.supplierName} | SKU ${item.sku} | ${item.name}`,quantity:item.quantity,unitPrice:item.costPrice===null?"TO CONFIRM":money(item.costPrice),total:item.costPrice===null?"TO CONFIRM":money(new Decimal(item.costPrice).mul(item.quantity))})),
    subtotal:money(total),
    total:money(total),
    notes:["INTERNAL PROCUREMENT DOCUMENT — NOT A CUSTOMER TAX INVOICE.","DELIVER DIRECTLY TO CUSTOMER.",`Internal order: ${order.orderNumber}.`,`Recipient: ${order.recipient??order.customer??"Confirm before submission"}.`,order.phone?`Recipient phone: ${order.phone}.`:"",order.deliveryAddress?`Delivery address: ${order.deliveryAddress}.`:"Delivery destination must be confirmed before submission.",order.deliveryInstructions?`Delivery instructions: ${order.deliveryInstructions}.`:"","Use these order-time details only for legitimate fulfilment. Confirm stock, price, dispatch and delivery with Innozanzi."].filter(Boolean).join("\n"),
  },branding);
}
