import { CataloguePage } from "@/components/store/catalogue-page";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export async function generateMetadata({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}):Promise<Metadata>{const query=await searchParams;const filtered=Object.values(query).some(Boolean);return{title:"Shop technology online",description:"Browse laptops, accessories, displays, printing, networking and power products with clear pricing and secure checkout.",alternates:{canonical:"/shop"},robots:filtered?{index:false,follow:true}:{index:true,follow:true}}}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ search?: string; category?: string; brand?: string; availability?:string; promotion?:string; collection?:string; sort?: string; page?: string }> }) {
  return <CataloguePage params={await searchParams} />;
}
