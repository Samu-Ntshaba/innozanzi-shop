import { requirePermission } from "@/domain/auth/session";
import { marketingResources, renderMarketingResource } from "@/domain/marketing/resources";
import { createZip } from "@/lib/zip";

export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
  await requirePermission("marketing.content.view");
  const{slug}=await params;
  if(slug==="all"){
    const readme=`INNOZANZI MARKETING RESOURCE PACK\n\nStart with Company Story & Positioning, then use Brand Standards before adapting any campaign material.\n\nFounder: Simukelo Ntshaba\nCompany: Innozanzi (Pty) Ltd\nWebsite: https://shop.innozanzi.co.za\n\nEach HTML document is designed for comfortable screen reading and clean A4 printing or PDF export. Verify changing product, price, promotion and availability information before publishing.\n`;
    const zip=createZip([{name:"README.txt",content:readme},...marketingResources.map(item=>({name:`documents/innozanzi-${item.slug}.html`,content:renderMarketingResource(item)}))]);
    return new Response(Buffer.from(zip),{headers:{"content-type":"application/zip","content-disposition":"attachment; filename=\"innozanzi-marketing-resource-pack.zip\"","cache-control":"private, no-store","x-content-type-options":"nosniff"}});
  }
  const resource=marketingResources.find(item=>item.slug===slug);
  if(!resource)return new Response("Marketing resource not found",{status:404});
  return new Response(renderMarketingResource(resource),{headers:{"content-type":"text/html; charset=utf-8","content-disposition":`attachment; filename="innozanzi-${resource.slug}.html"`,"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
}
