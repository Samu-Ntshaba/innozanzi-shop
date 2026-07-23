import { NextResponse } from "next/server";
import { hasPermission } from "@/domain/auth/permissions";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(_:Request,{params}:{params:Promise<{agreementNumber:string}>}){
  const ctx=await requireUser(),agreementNumber=decodeURIComponent((await params).agreementNumber);
  const agreement=await prisma.partnershipAgreement.findUnique({where:{agreementNumber},include:{partnership:{select:{userId:true}},versions:{orderBy:{version:"desc"},take:1}}});
  if(!agreement?.versions[0]?.pdfContent)return NextResponse.json({error:"Signed agreement PDF is not available."},{status:404});
  const allowed=agreement.partnership.userId===ctx.user.id||hasPermission(ctx.grants,"partnership.view",ctx.isSuperAdministrator);
  if(!allowed)return NextResponse.json({error:"Forbidden"},{status:403});
  return new NextResponse(Buffer.from(agreement.versions[0].pdfContent),{headers:{"content-type":"application/pdf","content-disposition":`attachment; filename="${agreement.versions[0].pdfFilename??`${agreement.agreementNumber}.pdf`}"`,"cache-control":"private, no-store"}});
}
