import { CataloguePage } from "@/components/store/catalogue-page";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { entityMetadata } from "@/domain/marketing/seo";

export const dynamic = "force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const category=await prisma.category.findUnique({where:{slug:(await params).slug}});if(!category||!category.isActive)return{robots:{index:false,follow:false}};return entityMetadata({entityType:"CATEGORY",entityId:category.id,path:`/categories/${category.slug}`,title:category.metaTitle??`${category.name} for South African businesses`,description:category.metaDescription??category.description,image:category.imagePath,keywords:[category.name,"business technology","South Africa"]})}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ search?: string; brand?: string; sort?: string; page?: string }> }) {
  const { slug } = await params;
  const heading = slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return <CataloguePage heading={heading} params={{ ...(await searchParams), category: slug }} />;
}
