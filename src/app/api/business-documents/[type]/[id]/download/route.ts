import { hasPermission } from "@/domain/auth/permissions";
import { getAuthContext } from "@/domain/auth/session";
import { assertBusinessDocumentAccess,businessDocumentTypes,getOrCreateBusinessDocument } from "@/domain/documents/business-documents";
import { prisma } from "@/lib/prisma";

export async function GET(_:Request,{params}:{params:Promise<{type:string;id:string}>}){
  const context=await getAuthContext();if(!context)return new Response("Unauthorized",{status:401});
  const raw=(await params).type.toUpperCase().replaceAll("-","_");
  if(!businessDocumentTypes.includes(raw as never))return new Response("Unsupported document type",{status:404});
  if(!hasPermission(context.grants,"documents.download",context.isSuperAdministrator))return new Response("Forbidden",{status:403});
  try{
    const type=raw as (typeof businessDocumentTypes)[number];const id=(await params).id;await assertBusinessDocumentAccess(context,type,id);
    const {artifact}=await getOrCreateBusinessDocument(type,id,context.user.id);
    await prisma.auditLog.create({data:{actorId:context.user.id,action:"document.download",entityType:"BusinessDocument",entityId:artifact.id,after:{type:artifact.type,recordId:artifact.recordId,version:artifact.version,filename:artifact.filename}}});
    return new Response(new Uint8Array(artifact.content),{headers:{"content-type":artifact.mimeType,"content-length":String(artifact.size),"content-disposition":`attachment; filename="${artifact.filename.replaceAll('"',"")}"`,"cache-control":"private, no-store"}});
  }catch(error){return new Response(error instanceof Error?error.message:"Document not found",{status:404})}
}
