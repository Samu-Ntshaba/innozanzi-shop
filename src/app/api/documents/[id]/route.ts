import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/domain/auth/session";
import { hasPermission } from "@/domain/auth/permissions";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await getAuthContext();if(!auth)return new Response("Unauthorized",{status:401});
  const document=await prisma.uploadedDocument.findUnique({where:{id:(await params).id},include:{
    paymentSubmission:{select:{submittedById:true}},partnershipDocument:{select:{uploadedById:true}},
    partnerRequestAttachment:{select:{request:{select:{partnership:{select:{userId:true}}}}}},
    rfqSource:{select:{rfq:{select:{companyId:true}}}},deliveryNoteAttachment:{select:{deliveryNote:{select:{customerEmail:true}}}},
    returnEvidence:{select:{customerVisible:true,returnCase:{select:{customerId:true}}}},
    refundPaymentProof:{select:{refund:{select:{returnCase:{select:{customerId:true}}}}}},
    distributorClaimDocument:{select:{distributorClaimId:true}},supplierDocument:{select:{supplierId:true}},
    transportDocuments:{select:{transportId:true}},transportQuoteDocument:{select:{transportId:true}},
    transportExpenseDocument:{select:{transportId:true}},transportPaymentProof:{select:{transportId:true}},
    transportProofDocuments:{select:{proof:{select:{transportId:true}}}},reimbursementReceipt:{select:{transportId:true}},
  }});
  if(!document)return new Response("Not found",{status:404});
  const owner=document.paymentSubmission?.submittedById===auth.user.id||document.partnershipDocument?.uploadedById===auth.user.id||document.partnerRequestAttachment?.request.partnership.userId===auth.user.id||document.deliveryNoteAttachment?.deliveryNote.customerEmail?.toLowerCase()===auth.user.email.toLowerCase()||(document.returnEvidence?.customerVisible===true&&document.returnEvidence.returnCase.customerId===auth.user.id)||document.refundPaymentProof?.refund.returnCase.customerId===auth.user.id;
  const rfqOwner=Boolean(auth.user.companyId && document.rfqSource && document.rfqSource.rfq.companyId===auth.user.companyId);
  const can=(key:Parameters<typeof hasPermission>[1])=>hasPermission(auth.grants,key,auth.isSuperAdministrator);
  const transport=Boolean(document.transportDocuments.length||document.transportQuoteDocument||document.transportExpenseDocument||document.transportPaymentProof||document.transportProofDocuments.length||document.reimbursementReceipt);
  const admin=auth.isSuperAdministrator
    || Boolean(document.paymentSubmission&&can("payments.approve"))
    || Boolean(document.deliveryNoteAttachment&&can("orders.view"))
    || Boolean(document.partnershipDocument&&can("partnership.document.review"))
    || Boolean(document.partnerRequestAttachment&&can("partnership.request.manage"))
    || Boolean(document.rfqSource&&can("rfq.view"))
    || Boolean((document.returnEvidence||document.refundPaymentProof||document.distributorClaimDocument)&&can("returns.view"))
    || Boolean(transport&&can("transport.documents.download"));
  if(!owner&&!rfqOwner&&!admin)return new Response("Forbidden",{status:403});
  const signed=await createSupabaseAdmin().storage.from(document.bucket).createSignedUrl(document.path,300);
  if(signed.error)return new Response("Document unavailable",{status:503});
  const response=NextResponse.redirect(signed.data.signedUrl);response.headers.set("Cache-Control","private, no-store");return response;
}
