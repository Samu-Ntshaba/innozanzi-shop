import { requirePermission } from "@/domain/auth/session";
import { supplierOrderRequestPdf } from "@/domain/orders/supplier-order-document";
import { prisma } from "@/lib/prisma";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  await requirePermission("orders.view");
  const order=await prisma.order.findUnique({where:{id:(await params).id},include:{items:true,addresses:{where:{type:{in:["DELIVERY","BOTH"]}},take:1}}});
  if(!order)return new Response("Order not found",{status:404});
  const requestedSupplierId=new URL(request.url).searchParams.get("supplierId");
  const supplierItems=order.items.filter(item=>(item.sourceType==="SUPPLIER"||item.supplierId)&&(!requestedSupplierId||item.supplierId===requestedSupplierId));
  if(!supplierItems.length)return new Response("No products for this distributor on the order",{status:404});
  const supplierIds=[...new Set(supplierItems.map(item=>item.supplierId).filter((id):id is string=>Boolean(id)))];
  const suppliers=await prisma.supplier.findMany({where:{id:{in:supplierIds}},select:{id:true,companyName:true}}),names=new Map(suppliers.map(item=>[item.id,item.companyName]));
  const address=order.addresses[0],supplierName=requestedSupplierId?names.get(requestedSupplierId):undefined;
  const pdf=await supplierOrderRequestPdf({orderNumber:order.orderNumber,createdAt:order.createdAt,customer:order.companyName??order.email,deliveryAddress:address?`${address.recipient}, ${address.line1}, ${address.city}, ${address.province}, ${address.postalCode}`:undefined,items:supplierItems.map(item=>({name:item.productName,sku:item.supplierSku??item.sku,quantity:item.quantity,costPrice:item.costPrice?.toString()??null,supplierName:item.supplierId?names.get(item.supplierId)??"Supplier":"Supplier"}))});
  const suffix=supplierName?`-${supplierName.replace(/[^a-z0-9]+/gi,"-")}`:"";
  return new Response(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="Supplier-Purchase-Order-${order.orderNumber}${suffix}.pdf"`,"Cache-Control":"private, no-store"}});
}
