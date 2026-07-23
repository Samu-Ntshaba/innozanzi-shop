import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { globalSeoSettings } from "@/domain/marketing/seo";
import { isTestModeEnvironment } from "@/lib/test-mode";
export const dynamic="force-dynamic";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  if(isTestModeEnvironment())return[];
  const [{siteUrl:base},products,categories,pages,excluded]=await Promise.all([globalSeoSettings(),prisma.product.findMany({where:{status:"PUBLISHED",deletedAt:null,isTestData:false},select:{id:true,slug:true,updatedAt:true}}),prisma.category.findMany({where:{isActive:true},select:{id:true,slug:true,updatedAt:true}}),prisma.page.findMany({where:{status:"PUBLISHED"},select:{id:true,slug:true,updatedAt:true}}),prisma.seoRecord.findMany({where:{OR:[{indexable:false},{includeInSitemap:false},{isTestData:true}]},select:{entityType:true,entityId:true}})]);
  const blocked=new Set(excluded.map(x=>`${x.entityType}:${x.entityId}`));const now=new Date();
  return[{url:base,lastModified:now,changeFrequency:"daily",priority:1},{url:`${base}/shop`,lastModified:now,changeFrequency:"daily",priority:.9},{url:`${base}/contact`,lastModified:now,changeFrequency:"monthly",priority:.7},{url:`${base}/how-to`,lastModified:now,changeFrequency:"monthly",priority:.6},...products.filter(x=>!blocked.has(`PRODUCT:${x.id}`)).map(x=>({url:`${base}/products/${x.slug}`,lastModified:x.updatedAt,changeFrequency:"weekly" as const,priority:.8})),...categories.filter(x=>!blocked.has(`CATEGORY:${x.id}`)).map(x=>({url:`${base}/categories/${x.slug}`,lastModified:x.updatedAt,changeFrequency:"weekly" as const,priority:.7})),...pages.filter(x=>!blocked.has(`PAGE:${x.id}`)).map(x=>({url:`${base}/policies/${x.slug}`,lastModified:x.updatedAt,changeFrequency:"monthly" as const,priority:.4}))];
}
