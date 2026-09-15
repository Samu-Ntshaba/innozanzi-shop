import { prisma } from "@/lib/prisma";

export async function recordPaymentDiagnostic(paymentId:string,stage:string,details:Record<string,string|boolean|number|null>){
  await prisma.auditLog.create({data:{action:`payment.${stage}`,entityType:"Payment",entityId:paymentId,metadata:details}});
}

export function paymentFailureCode(error:unknown){
  const message=error instanceof Error?error.message:"";
  if(message.includes("signature"))return "INVALID_SIGNATURE";
  if(message.includes("merchant"))return "MERCHANT_MISMATCH";
  if(message.includes("amount mismatch"))return "AMOUNT_MISMATCH";
  if(message.includes("currency"))return "CURRENCY_MISMATCH";
  if(message.includes("Unknown payment"))return "UNKNOWN_REFERENCE";
  if(message.includes("reference conflict"))return "REFERENCE_CONFLICT";
  if(message.includes("not complete"))return "PROVIDER_NOT_COMPLETE";
  return "VERIFICATION_OR_PROCESSING_UNAVAILABLE";
}
