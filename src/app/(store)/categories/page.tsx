import Link from "next/link";
import type { Metadata } from "next";
import { CategoryIcon } from "@/components/store/category-icon";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Technology categories",
  description: "Browse technology categories and shop online with clear pricing.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const [manual,supplier] = await Promise.all([prisma.category.findMany({
    where: { isActive: true, products: { some: { status: "PUBLISHED", deletedAt: null, isTestData: false } } },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, description: true, imagePath: true },
  }),prisma.supplierCatalogueProduct.groupBy({by:["category"],where:{active:true,category:{not:null},images:{isEmpty:false}},_count:true,orderBy:{category:"asc"}})]);
  const categories=[...supplier.map((x,index)=>({id:`supplier-${index}`,name:x.category!,slug:x.category!,description:`${x._count} available catalogue products`,imagePath:null})),...manual.filter(x=>!supplier.some(s=>s.category?.toLowerCase()===x.name.toLowerCase()))];
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Technology categories</h1><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{categories.map(category => <Link className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:bg-sky-50/40" href={`/categories/${encodeURIComponent(category.slug)}`} key={category.id}><div className="grid size-10 place-items-center rounded-lg bg-slate-100 text-sky-800 group-hover:bg-white"><CategoryIcon value={category.imagePath} slug={category.slug} className="size-5"/></div><h2 className="mt-3 font-semibold text-slate-950">{category.name}</h2>{category.description ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{category.description}</p> : null}</Link>)}</div></main>;
}
