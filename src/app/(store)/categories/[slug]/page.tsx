import { CataloguePage } from "@/components/store/catalogue-page";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { entityMetadata } from "@/domain/marketing/seo";

export const dynamic="force-dynamic";
const decodeCategory=(value:string)=>{try{return decodeURIComponent(value)}catch{return value}};

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const slug=decodeCategory((await params).slug);
  const category=await prisma.category.findUnique({where:{slug}});
  if(category?.isActive)return entityMetadata({entityType:"CATEGORY",entityId:category.id,path:`/categories/${category.slug}`,title:category.metaTitle??`${category.name} in South Africa`,description:category.metaDescription??category.description,image:category.imagePath,keywords:[category.name,"technology products","South Africa"]});
  const supplier=await prisma.supplierCatalogueProduct.findFirst({where:{active:true,images:{isEmpty:false},category:{equals:slug,mode:"insensitive"}},select:{category:true}});
  return supplier?{title:`${supplier.category} products`,description:`Browse and buy ${supplier.category} products with secure checkout and delivery.`,alternates:{canonical:`/categories/${encodeURIComponent(supplier.category!)}`}}:{robots:{index:false,follow:false}};
}

export default async function CategoryPage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{search?:string;brand?:string;sort?:string;page?:string}>}){
  const slug=decodeCategory((await params).slug);
  return <CataloguePage heading={slug} params={{...(await searchParams),category:slug}}/>;
}
