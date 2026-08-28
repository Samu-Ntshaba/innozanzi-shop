import { requirePermission } from "@/domain/auth/session";
import { marketingResources, renderMarketingResource } from "@/domain/marketing/resources";

export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
  await requirePermission("marketing.content.view");
  const{slug}=await params,resource=marketingResources.find(item=>item.slug===slug);
  if(!resource)return new Response("Marketing resource not found",{status:404});
  return new Response(renderMarketingResource(resource),{headers:{"content-type":"text/html; charset=utf-8","content-disposition":`attachment; filename="innozanzi-${resource.slug}.html"`,"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
}
