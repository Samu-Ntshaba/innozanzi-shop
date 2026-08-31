import { requirePermission } from "@/domain/auth/session";
import { supplierOrderRequestPdf } from "@/domain/orders/supplier-order-document";
import { prisma } from "@/lib/prisma";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  await requirePermission("orders.view");
  const order=await prisma.order.findUnique({where:{id:(await params).id},include:{items:true}});
  if(!order)return new Response("Order not found",{status:404});
  const supplierIds=[...new Set(order.items.map(item=>item.supplierId).filter((id):id is string=>Boolean(id)))];
  const suppliers=await prisma.supplier.findMany({where:{id:{in:supplierIds}},select:{id:true,companyName:true}}),names=new Map(suppliers.map(item=>[item.id,item.companyName]));
  const pdf=await supplierOrderRequestPdf({orderNumber:order.orderNumber,createdAt:order.createdAt,items:order.items.filter(item=>item.sourceType==="SUPPLIER"||item.supplierId).map(item=>({name:item.productName,sku:item.supplierSku??item.sku,quantity:item.quantity,costPrice:item.costPrice?.toString()??null,supplierName:item.supplierId?names.get(item.supplierId)??"Supplier":"Supplier"}))});
  return new Response(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="Supplier-Order-${order.orderNumber}.pdf"`,"Cache-Control":"private, no-store"}});
}
