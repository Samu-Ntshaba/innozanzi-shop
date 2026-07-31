"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase";

const optionalText=(max:number)=>z.string().trim().max(max).optional().transform(value=>value||null);
const supplierSchema=z.object({
  companyName:z.string().trim().min(2).max(200),registrationNo:z.string().trim().min(3).max(80),vatNo:z.string().trim().min(3).max(80),
  contactPerson:z.string().trim().min(2).max(160),email:z.string().trim().email(),phone:z.string().trim().min(7).max(40),
  accountsContact:z.string().trim().min(2).max(160),accountsEmail:z.string().trim().email(),accountsPhone:z.string().trim().min(7).max(40),
  website:z.string().trim().url(),physicalAddress:z.string().trim().min(10).max(1000),branchAddress:optionalText(1000),
  accountNumber:optionalText(120),resellerId:optionalText(120),paymentTerms:z.string().trim().min(10).max(3000),
  creditLimit:z.preprocess(value=>value===""?null:value,z.coerce.number().nonnegative().nullable()),notes:optionalText(5000),
});

export async function createDistributor(formData:FormData){
  const ctx=await requirePermission("products.update"),data=supplierSchema.parse(Object.fromEntries(formData));
  const supplier=await prisma.$transaction(async tx=>{const created=await tx.supplier.create({data});await tx.auditLog.create({data:{actorId:ctx.user.id,action:"supplier.create",entityType:"Supplier",entityId:created.id,after:{companyName:data.companyName,registrationNo:data.registrationNo,vatNo:data.vatNo}}});return created});
  redirect(`/admin/suppliers/${supplier.id}`);
}

export async function updateDistributor(formData:FormData){
  const ctx=await requirePermission("products.update"),input=supplierSchema.extend({id:z.string().uuid(),isActive:z.string().optional()}).parse(Object.fromEntries(formData));
  const{id,isActive,...data}=input,before=await prisma.supplier.findUniqueOrThrow({where:{id}});
  await prisma.$transaction([prisma.supplier.update({where:{id},data:{...data,isActive:isActive==="on"}}),prisma.auditLog.create({data:{actorId:ctx.user.id,action:"supplier.update",entityType:"Supplier",entityId:id,before:{companyName:before.companyName,isActive:before.isActive},after:{companyName:data.companyName,isActive:isActive==="on"}}})]);
  revalidatePath("/admin/suppliers");revalidatePath(`/admin/suppliers/${id}`);
}

const MAX=10*1024*1024,TYPES=new Set(["application/pdf","image/jpeg","image/png","image/webp","text/csv","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
export async function uploadSupplierDocument(formData:FormData){
  const ctx=await requirePermission("products.update");
  const data=z.object({supplierId:z.string().uuid(),type:z.enum(["PAYMENT_POLICY","RESELLER_CERTIFICATE","ACCOUNT_APPLICATION","PRICE_LIST","AGREEMENT","TAX_DOCUMENT","OTHER"]),title:z.string().trim().min(3).max(200),expiryDate:z.string().optional(),notes:z.string().trim().max(2000).optional()}).parse(Object.fromEntries(formData));
  const supplier=await prisma.supplier.findUniqueOrThrow({where:{id:data.supplierId},select:{id:true}});
  const file=formData.get("file");if(!(file instanceof File)||!file.size||file.size>MAX||!TYPES.has(file.type))throw new Error("Upload a PDF, image, CSV or XLSX document smaller than 10 MB.");
  const bucket=process.env.SUPABASE_PRIVATE_BUCKET??"private-documents",storage=createSupabaseAdmin();
  if(!(await storage.storage.getBucket(bucket)).data){const created=await storage.storage.createBucket(bucket,{public:false,fileSizeLimit:MAX});if(created.error)throw created.error}
  const path=`suppliers/${supplier.id}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`,uploaded=await storage.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});if(uploaded.error)throw uploaded.error;
  try{await prisma.$transaction(async tx=>{const document=await tx.uploadedDocument.create({data:{bucket,path,originalName:file.name,mimeType:file.type,size:file.size,isPrivate:true}});await tx.supplierDocument.create({data:{supplierId:supplier.id,documentId:document.id,type:data.type,title:data.title,expiryDate:data.expiryDate?new Date(data.expiryDate):null,notes:data.notes||null}});await tx.auditLog.create({data:{actorId:ctx.user.id,action:"supplier.document.upload",entityType:"Supplier",entityId:supplier.id,after:{documentId:document.id,type:data.type,title:data.title,originalName:file.name}}})})}catch(error){await storage.storage.from(bucket).remove([path]);throw error}
  revalidatePath(`/admin/suppliers/${supplier.id}`);
}
