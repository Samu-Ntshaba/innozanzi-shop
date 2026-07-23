import { getAuthContext } from "@/domain/auth/session";
import { hasPermission } from "@/domain/auth/permissions";
import { commercialPdf } from "@/domain/documents/commercial-pdf";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const auth=await getAuthContext();if(!auth)return new Response("Unauthorized",{status:401});
  const order=await prisma.order.findUnique({where:{orderNumber:(await params).orderNumber},include:{items:true,shipments:{orderBy:{createdAt:"desc"},take:1}}});
  if(!order)return new Response("Not found",{status:404});
  if(order.userId!==auth.user.id&&!hasPermission(auth.grants,"orders.view",auth.isSuperAdministrator))return new Response("Forbidden",{status:403});
  const shipment=order.shipments[0];const note=shipment?.deliveryNoteNumber??`DN-${order.orderNumber}`;
  const pdf=commercialPdf({title:"DELIVERY NOTE",number:note,customer:order.companyName??order.email,email:order.email,issueDate:new Date(),dueDate:shipment?.estimatedDeliveryAt??undefined,reference:order.orderNumber,lines:order.items.map(item=>({description:`${item.productName} (${item.sku})`,quantity:item.quantity})),notes:[shipment?.deliveryCompany?`Delivery company: ${shipment.deliveryCompany}`:"",shipment?.trackingNumber?`Tracking: ${shipment.trackingNumber}`:"",shipment?.deliveryInstructions].filter(Boolean).join(" | ")});
  return new Response(new Uint8Array(pdf),{headers:{"content-type":"application/pdf","content-disposition":`inline; filename=\"${note}.pdf\"`}});
}
