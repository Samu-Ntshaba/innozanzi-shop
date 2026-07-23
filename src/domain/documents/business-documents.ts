import { commercialPdf } from "@/domain/documents/commercial-pdf";
import { getDocumentBranding } from "@/domain/documents/branding";
import { quotationPdf } from "@/domain/quotations/pdf";
import type { Prisma } from "@/generated/prisma/client";
import { hasPermission,type PermissionGrant,type PermissionKey } from "@/domain/auth/permissions";
import { prisma } from "@/lib/prisma";

export const businessDocumentTypes=["QUOTATION","INVOICE","DELIVERY_NOTE","RFQ","ORDER"] as const;
export type BusinessDocumentType=(typeof businessDocumentTypes)[number];

export async function assertBusinessDocumentAccess(context:{grants:readonly PermissionGrant[];isSuperAdministrator:boolean;user:{companyId?:string|null}},type:BusinessDocumentType,recordId:string){
  const permission:PermissionKey=type==="RFQ"?"rfq.view":type==="QUOTATION"||type==="INVOICE"?"quotations.manage":"orders.view";
  if(!hasPermission(context.grants,permission,context.isSuperAdministrator))throw new Error("You do not have access to the source record.");
  if(type==="RFQ"&&!context.isSuperAdministrator&&context.user.companyId){const record=await prisma.rfqOpportunity.findUnique({where:{id:recordId},select:{companyId:true}});if(!record||record.companyId!==context.user.companyId)throw new Error("You do not have access to this RFQ.")}
}

const zar=(value:{toString():string})=>`R ${Number(value.toString()).toLocaleString("en-ZA",{minimumFractionDigits:2})}`;
const safe=(value:string)=>value.normalize("NFKD").replace(/[^\w.-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,80)||"Record";
const snapshot=(value:unknown)=>JSON.parse(JSON.stringify(value));

export type DocumentDescriptor={
  type:BusinessDocumentType;recordId:string;number:string;version:number;state:"DRAFT"|"ISSUED"|"VOID";
  label:string;recipientName:string;recipientEmail:string|null;filename:string;subject:string;message:string;
  pdf:Buffer;snapshot:Prisma.InputJsonValue;isTestData:boolean;
};

export async function describeBusinessDocument(type:BusinessDocumentType,recordId:string):Promise<DocumentDescriptor>{
  const branding=await getDocumentBranding();
  if(type==="QUOTATION"){
    const row=await prisma.quotation.findUnique({where:{id:recordId},include:{items:true,quotationRequest:true,customer:{select:{email:true}},createdBy:{select:{name:true,email:true,phone:true}}}});
    if(!row)throw new Error("Quotation not found.");
    const name=row.quotationRequest?.companyName??row.quotationRequest?.contactName??"Customer";
    const issued=Boolean(row.issuedAt)||["FINAL_APPROVED","SENT","PAYMENT_SUBMITTED","PAYMENT_VERIFIED","PROCESSING","READY_FOR_DELIVERY","IN_TRANSIT","DELIVERED","COMPLETED"].includes(row.status);
    return {type,recordId,number:row.quotationNumber,version:row.version,state:row.status==="CANCELLED"?"VOID":issued?"ISSUED":"DRAFT",label:`${row.kind==="FINAL"?"Final":"Provisional"} quotation`,recipientName:name,recipientEmail:row.quotationRequest?.email??row.customer?.email??null,filename:`Quotation-${safe(row.quotationNumber)}-${safe(name)}.pdf`,subject:`Quotation ${row.quotationNumber} from Innozanzi`,message:`Hello ${name},\n\nPlease find quotation ${row.quotationNumber} attached for your review. It is valid until ${row.validUntil.toLocaleDateString("en-ZA")}.\n\nPlease contact our support team if you would like us to clarify or adjust anything.`,pdf:quotationPdf(row,branding),snapshot:snapshot(row),isTestData:row.isTestData};
  }
  if(type==="INVOICE"){
    const row=await prisma.invoice.findUnique({where:{id:recordId},include:{items:{orderBy:{sortOrder:"asc"}},quotation:{select:{quotationNumber:true}},order:{select:{orderNumber:true}}}});
    if(!row)throw new Error("Invoice not found.");
    const name=row.companyName??row.customerName;const issued=row.status!=="DRAFT";
    const pdf=commercialPdf({title:issued?"INVOICE":"DRAFT INVOICE — NOT ISSUED",number:row.invoiceNumber,customer:name,email:row.customerEmail,issueDate:row.issuedAt??row.createdAt,dueDate:row.dueAt,reference:row.order?.orderNumber??row.quotation?.quotationNumber,lines:row.items.map(item=>({description:item.description,quantity:item.quantity,unitPrice:zar(item.unitPrice),total:zar(item.lineTotal)})),subtotal:zar(row.subtotal),vat:zar(row.vatTotal),total:zar(row.grandTotal),notes:[row.billingAddress?`Billing address: ${row.billingAddress}`:null,row.paymentTerms,row.notes].filter(Boolean).join("\n")},branding);
    return {type,recordId,number:row.invoiceNumber,version:1,state:["VOID","CANCELLED","CREDITED"].includes(row.status)?"VOID":issued?"ISSUED":"DRAFT",label:"Invoice",recipientName:name,recipientEmail:row.customerEmail,filename:`Invoice-${safe(row.invoiceNumber)}-${safe(name)}.pdf`,subject:`Invoice ${row.invoiceNumber} from Innozanzi`,message:`Hello ${name},\n\nPlease find invoice ${row.invoiceNumber} for ${zar(row.grandTotal)} attached. Payment is due by ${row.dueAt.toLocaleDateString("en-ZA")}.\n\nPlease use the payment information shown on the issued invoice and contact us if you need assistance.`,pdf,snapshot:snapshot(row),isTestData:row.isTestData};
  }
  if(type==="DELIVERY_NOTE"){
    const row=await prisma.deliveryNote.findUnique({where:{id:recordId},include:{items:{orderBy:{sortOrder:"asc"}},order:{select:{orderNumber:true}},invoice:{select:{invoiceNumber:true}}}});
    if(!row)throw new Error("Delivery note not found.");
    const name=row.companyName??row.customerName;const issued=row.status!=="DRAFT";
    const pdf=commercialPdf({title:issued?"DELIVERY NOTE":"DRAFT DELIVERY NOTE — NOT ISSUED",number:row.deliveryNoteNumber,customer:name,email:row.customerEmail??"",issueDate:row.createdAt,dueDate:row.deliveryDate??undefined,reference:row.order?.orderNumber??row.invoice?.invoiceNumber??row.reference??undefined,lines:row.items.map(item=>({description:item.description,quantity:item.quantity,total:item.deliveredQty?`${item.deliveredQty} delivered`:"Pending"})),notes:[`Delivery address: ${row.deliveryAddress}`,row.deliveryMethod?`Delivery method: ${row.deliveryMethod}`:null,row.instructions,row.customerNote].filter(Boolean).join("\n")},branding);
    return {type,recordId,number:row.deliveryNoteNumber,version:1,state:row.status==="CANCELLED"?"VOID":issued?"ISSUED":"DRAFT",label:"Delivery note",recipientName:name,recipientEmail:row.customerEmail,filename:`Delivery-Note-${safe(row.deliveryNoteNumber)}-${safe(name)}.pdf`,subject:`Delivery note ${row.deliveryNoteNumber} from Innozanzi`,message:`Hello ${name},\n\nPlease find delivery note ${row.deliveryNoteNumber} attached${row.order?.orderNumber?` for order ${row.order.orderNumber}`:""}.\n\nPlease review the delivery information and contact our support team if anything needs attention.`,pdf,snapshot:snapshot(row),isTestData:row.isTestData};
  }
  if(type==="ORDER"){
    const row=await prisma.order.findUnique({where:{id:recordId},include:{items:true,addresses:true,user:{select:{name:true}}}});
    if(!row)throw new Error("Order not found.");const name=row.companyName??row.user?.name??row.email;const address=row.addresses.find(item=>item.type==="DELIVERY"||item.type==="BOTH");
    const pdf=commercialPdf({title:"CUSTOMER ORDER CONFIRMATION",number:row.orderNumber,customer:name,email:row.email,issueDate:row.placedAt??row.createdAt,reference:row.purchaseOrderNumber??undefined,lines:row.items.map(item=>({description:item.productName,quantity:item.quantity,unitPrice:zar(item.unitPrice),total:zar(item.lineTotal)})),subtotal:zar(row.subtotal),vat:zar(row.vatTotal),total:zar(row.grandTotal),notes:[address?`Delivery address: ${[address.line1,address.line2,address.suburb,address.city,address.province,address.postalCode].filter(Boolean).join(", ")}`:null,row.customerNotes,`Payment status: ${row.paymentStatus.replaceAll("_"," ")}`,`Fulfilment status: ${row.status.replaceAll("_"," ")}`].filter(Boolean).join("\n")},branding);
    return {type,recordId,number:row.orderNumber,version:1,state:row.status==="CANCELLED"?"VOID":"ISSUED",label:"Order confirmation",recipientName:name,recipientEmail:row.email,filename:`Order-${safe(row.orderNumber)}-${safe(name)}.pdf`,subject:`Order ${row.orderNumber} confirmation from Innozanzi`,message:`Hello ${name},\n\nPlease find the confirmation for order ${row.orderNumber} attached. The agreed total is ${zar(row.grandTotal)}.\n\nYou can continue to follow fulfilment updates from your Innozanzi account.`,pdf,snapshot:snapshot(row),isTestData:row.isTestData};
  }
  const row=await prisma.rfqOpportunity.findUnique({where:{id:recordId},include:{lineItems:true,createdBy:{select:{name:true,email:true}},_count:{select:{pricingRevisions:true}}}});
  if(!row)throw new Error("RFQ not found.");
  const issued=["APPROVED","SUBMITTED","WON","LOST","COMPLETED"].includes(row.status);const name=row.issuingOrganisation;
  const pdf=commercialPdf({title:`${issued?"":"DRAFT "}${row.type} RESPONSE`,number:row.referenceNumber,customer:name,email:row.contactEmail??"",issueDate:row.submittedExternallyAt??row.createdAt,dueDate:row.closingAt??undefined,reference:row.externalReference??undefined,lines:row.lineItems.map(item=>({description:item.description,quantity:Number(item.quantity),unitPrice:zar(item.sellingPricePerUnit),total:zar(item.sellingSubtotal)})),subtotal:zar(row.sellingBeforeVat),vat:zar(row.totalVat),total:zar(row.sellingIncludingVat),notes:[row.description,row.submissionMethod?`Submission method: ${row.submissionMethod}`:null,row.notes].filter(Boolean).join("\n")},branding);
  return {type,recordId,number:row.referenceNumber,version:Math.max(1,row._count.pricingRevisions),state:["CANCELLED","EXPIRED"].includes(row.status)?"VOID":issued?"ISSUED":"DRAFT",label:`${row.type} response`,recipientName:name,recipientEmail:row.contactEmail,filename:`${safe(row.type)}-${safe(row.referenceNumber)}-${safe(name)}.pdf`,subject:`${row.type} response ${row.referenceNumber} from Innozanzi`,message:`Hello ${row.contactName??name},\n\nPlease find our ${row.type} response ${row.referenceNumber} attached for your review.${row.closingAt?` The recorded response deadline is ${row.closingAt.toLocaleString("en-ZA")}.`:""}\n\nPlease contact us if any supporting information is required.`,pdf,snapshot:snapshot(row),isTestData:false};
}

export async function getOrCreateBusinessDocument(type:BusinessDocumentType,recordId:string,actorId?:string){
  const descriptor=await describeBusinessDocument(type,recordId);
  const existing=await prisma.businessDocument.findUnique({where:{type_recordId_version:{type,recordId,version:descriptor.version}},include:{dispatches:{include:{sentBy:{select:{name:true,email:true}}},orderBy:{createdAt:"desc"}}}});
  if(existing&&(existing.state!=="DRAFT"||existing.dispatches.some(item=>item.status==="SENT")))return {artifact:existing,descriptor};
  const data={documentNumber:descriptor.number,state:descriptor.state,filename:descriptor.filename,content:Uint8Array.from(descriptor.pdf),size:descriptor.pdf.length,snapshot:descriptor.snapshot,issuedAt:descriptor.state==="ISSUED"?new Date():null,isTestData:descriptor.isTestData,...(actorId?{generatedBy:{connect:{id:actorId}}}:{})};
  const saved=existing?await prisma.businessDocument.update({where:{id:existing.id},data}):await prisma.businessDocument.create({data:{type,recordId,version:descriptor.version,...data}});
  const artifact=await prisma.businessDocument.findUniqueOrThrow({where:{id:saved.id},include:{dispatches:{include:{sentBy:{select:{name:true,email:true}}},orderBy:{createdAt:"desc"}}}});
  return {artifact,descriptor};
}
