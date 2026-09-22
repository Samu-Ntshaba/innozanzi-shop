import { NextResponse } from "next/server";
import { requirePermission } from "@/domain/auth/session";
import { saveOrderProcurement } from "@/domain/orders/procurement-actions";
import { publicSiteUrl } from "@/lib/public-site-url";
import { boundedFormData, browserMutationGuard } from "@/lib/security/request";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const guard=browserMutationGuard(request,"application/x-www-form-urlencoded");
  if(guard)return guard;
  await requirePermission("orders.update");
  const {id}=await params;
  const formData=await boundedFormData(request,32_768);
  if(formData.get("orderId")!==id)return Response.json({error:"Order reference mismatch."},{status:400});
  const target=new URL(`/admin/orders/${id}`,publicSiteUrl());target.hash="supplier-order";
  try{
    await saveOrderProcurement(formData);
    target.searchParams.set("supplierProgress","saved");
  }catch(error){
    target.searchParams.set("supplierProgress","error");
    target.searchParams.set("message",error instanceof Error?error.message.slice(0,300):"Supplier progress could not be saved.");
  }
  return NextResponse.redirect(target,303);
}
