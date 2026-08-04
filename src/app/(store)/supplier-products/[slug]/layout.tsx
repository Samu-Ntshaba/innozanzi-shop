import { prisma } from "@/lib/prisma";
import { globalSeoSettings, safeJsonLd } from "@/domain/marketing/seo";

export default async function SupplierProductLayout({children,params}:{children:React.ReactNode;params:Promise<{slug:string}>}){
  const product=await prisma.supplierCatalogueProduct.findFirst({where:{slug:(await params).slug,active:true}});
  if(!product)return children;
  const seo=await globalSeoSettings();const url=`${seo.siteUrl}/supplier-products/${product.slug}`;
  const data=[
    {"@context":"https://schema.org","@type":"Product","@id":`${url}#product`,name:product.name,sku:product.supplierSku,mpn:product.manufacturerSku??undefined,gtin:product.barcode??undefined,description:(product.shortDescription??product.description??"").replace(/<[^>]+>/g," ").trim()||undefined,image:product.images,brand:product.brand?{"@type":"Brand",name:product.brand}:undefined,category:product.category??undefined,url,potentialAction:{"@type":"AskAction",name:"Request a quotation",target:url}},
    {"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[["Home",seo.siteUrl],["Products",`${seo.siteUrl}/shop`],[product.category??"Catalogue",`${seo.siteUrl}/categories/${encodeURIComponent(product.category??"catalogue")}`],[product.name,url]].map(([name,item],index)=>({"@type":"ListItem",position:index+1,name,item}))},
  ];
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(data)}}/>{children}</>;
}
