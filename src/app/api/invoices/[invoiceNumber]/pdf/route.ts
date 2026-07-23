import { getAuthContext } from "@/domain/auth/session";
import { hasPermission } from "@/domain/auth/permissions";
import { commercialPdf } from "@/domain/documents/commercial-pdf";
import { prisma } from "@/lib/prisma";

const zar = (value: { toString(): string }) => `R ${Number(value.toString()).toLocaleString("en-ZA",{minimumFractionDigits:2})}`;
export async function GET(_: Request, { params }: { params: Promise<{ invoiceNumber: string }> }) {
  const auth=await getAuthContext();if(!auth)return new Response("Unauthorized",{status:401});
  const invoice=await prisma.invoice.findUnique({where:{invoiceNumber:(await params).invoiceNumber},include:{items:{orderBy:{sortOrder:"asc"}},quotation:{select:{quotationNumber:true}},order:{select:{orderNumber:true}}}});
  if(!invoice)return new Response("Not found",{status:404});
  if(invoice.customerEmail.toLowerCase()!==auth.user.email.toLowerCase()&&!hasPermission(auth.grants,"quotations.manage",auth.isSuperAdministrator))return new Response("Forbidden",{status:403});
  const pdf=commercialPdf({title:"INVOICE",number:invoice.invoiceNumber,customer:invoice.companyName??invoice.customerName,email:invoice.customerEmail,issueDate:invoice.issuedAt??invoice.createdAt,dueDate:invoice.dueAt,reference:invoice.order?.orderNumber??invoice.quotation?.quotationNumber,lines:invoice.items.map(item=>({description:item.description,quantity:item.quantity,unitPrice:zar(item.unitPrice),total:zar(item.lineTotal)})),subtotal:zar(invoice.subtotal),vat:zar(invoice.vatTotal),total:zar(invoice.grandTotal),notes:[invoice.billingAddress?`Billing address: ${invoice.billingAddress}`:null,invoice.paymentTerms,invoice.notes].filter(Boolean).join("\n")});
  return new Response(new Uint8Array(pdf),{headers:{"content-type":"application/pdf","content-disposition":`inline; filename=\"${invoice.invoiceNumber}.pdf\"`}});
}
