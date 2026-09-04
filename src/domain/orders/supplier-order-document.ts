import Decimal from "decimal.js";
import { commercialPdf } from "@/domain/documents/commercial-pdf";
import { getDocumentBranding } from "@/domain/documents/branding";

export type SupplierOrderDocument = {
  orderNumber:string;
  createdAt:Date;
  customer?:string;
  deliveryAddress?:string;
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
    notes:["INTERNAL PROCUREMENT DOCUMENT — NOT A CUSTOMER TAX INVOICE.",`Internal order: ${order.orderNumber}.`,`Customer/company: ${order.customer??"Not required by supplier"}.`,order.deliveryAddress?`Required delivery destination: ${order.deliveryAddress}.`:"Delivery destination must be confirmed before submission.","Every requested supplier SKU is listed. Confirm live supplier price, stock, invoice total and expected arrival before submission. Known values use the immutable buying-price snapshot captured on the order; TO CONFIRM means no buying-price snapshot was available."].join("\n"),
  },branding);
}
