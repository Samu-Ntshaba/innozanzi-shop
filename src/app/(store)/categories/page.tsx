import Link from "next/link";
import type { Metadata } from "next";
import { CategoryIcon } from "@/components/store/category-icon";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Technology categories",
  description: "Browse all active Innozanzi business technology categories.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, description: true, imagePath: true },
  });
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Technology categories</h1><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{categories.map(category => <Link className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:bg-sky-50/40" href={`/categories/${category.slug}`} key={category.id}><div className="grid size-10 place-items-center rounded-lg bg-slate-100 text-sky-800 group-hover:bg-white"><CategoryIcon value={category.imagePath} slug={category.slug} className="size-5"/></div><h2 className="mt-3 font-semibold text-slate-950">{category.name}</h2>{category.description ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{category.description}</p> : null}</Link>)}</div>{!categories.length ? <p className="mt-8 rounded-lg border border-dashed p-10 text-center text-slate-500">Categories will appear here when they are published.</p> : null}</main>;
}
