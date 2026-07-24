import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicPolicies } from "@/domain/content/public-policies";
import { prisma } from "@/lib/prisma";

async function getPolicy(slug: string) {
  const fallback = publicPolicies[slug];
  try {
    const page = await prisma.page.findUnique({ where: { slug } });
    if (page?.status === "PUBLISHED") return page;
  } catch (error) {
    console.error(`Policy page ${slug} unavailable from the database`, error);
  }
  return fallback ? { ...fallback, slug, metaTitle: null, metaDescription: fallback.description } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const page = await getPolicy(slug);
  if (!page) return {};
  return { title: page.metaTitle ?? page.title, description: page.metaDescription, alternates: { canonical: `/policies/${slug}` } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const page = await getPolicy((await params).slug);
  if (!page) notFound();
  return <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16"><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Legal information</p><h1 className="mt-2 text-3xl font-bold text-[#071b33] sm:text-4xl">{page.title}</h1><article className="mt-8 whitespace-pre-wrap text-sm leading-7 text-slate-700 sm:text-base">{page.content}</article></main>;
}
