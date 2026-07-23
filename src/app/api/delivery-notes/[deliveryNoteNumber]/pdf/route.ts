import { getAuthContext } from "@/domain/auth/session";
import { hasPermission } from "@/domain/auth/permissions";
import { commercialPdf } from "@/domain/documents/commercial-pdf";
import { prisma } from "@/lib/prisma";

export async function GET(_:Request,{params}:{params:Promise<{deliveryNoteNumber:string}>}){
  const auth=await getAuthContext();if(!auth)return new Response("Unauthorized",{status:401});const note=await prisma.deliveryNote.findUnique({where:{deliveryNoteNumber:(await params).deliveryNoteNumber},include:{items:{orderBy:{sortOrder:"asc"}},order:{select:{orderNumber:true}},invoice:{select:{invoiceNumber:true}}}});if(!note)return new Response("Not found",{status:404});if(note.customerEmail?.toLowerCase()!==auth.user.email.toLowerCase()&&!hasPermission(auth.grants,"orders.view",auth.isSuperAdministrator))return new Response("Forbidden",{status:403});
  const pdf=commercialPdf({title:"DELIVERY NOTE",number:note.deliveryNoteNumber,customer:note.companyName??note.customerName,email:note.customerEmail??"",issueDate:note.createdAt,dueDate:note.deliveryDate??undefined,reference:note.order?.orderNumber??note.invoice?.invoiceNumber??note.reference??undefined,lines:note.items.map(x=>({description:x.description,quantity:x.quantity,unitPrice:"",total:x.deliveredQty?`${x.deliveredQty} delivered`:"Pending"})),subtotal:"",vat:"",total:"",notes:[`Delivery address: ${note.deliveryAddress}`,note.deliveryMethod?`Delivery method: ${note.deliveryMethod}`:null,note.instructions,note.customerNote,note.confirmationName?`Received by: ${note.confirmationName}`:null].filter(Boolean).join("\n")});
  return new Response(new Uint8Array(pdf),{headers:{"content-type":"application/pdf","content-disposition":`inline; filename=\"${note.deliveryNoteNumber}.pdf\"`}});
}
