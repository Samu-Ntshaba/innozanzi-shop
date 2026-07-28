import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { entityMetadata } from "@/domain/marketing/seo";
import { blogLabel } from "@/domain/blog/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return entityMetadata({ entityType: "PAGE", entityId: "blog", path: "/blog", title: "Technology insights", description: "Practical, researched guidance for South African organisations buying, managing and supporting business technology.", keywords: ["business technology", "technology buying guides", "South Africa"] });
}

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({ where: { status: "PUBLISHED", publishedAt: { lte: new Date() } }, orderBy: { publishedAt: "desc" } });
  const [featured, ...rest] = posts;
  return <main>
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20"><p className="text-sm font-bold uppercase tracking-[.16em] text-sky-700">Innozanzi insights</p><h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Clear guidance for better technology decisions.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Practical articles for South African teams choosing, deploying and supporting business technology.</p></div>
    </section>
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {!featured ? <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center"><h2 className="text-xl font-bold">Insights are on the way</h2><p className="mt-2 text-slate-600">Our team is preparing practical technology guidance. Please check back soon.</p></div> : <>
        <Link href={`/blog/${featured.slug}`} className="group grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
          <div className="relative min-h-72 bg-slate-100">{featured.coverImageUrl ? <Image src={featured.coverImageUrl} alt={featured.coverImageAlt ?? featured.title} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.02]"/> : <div className="absolute inset-0 bg-[#071b33]"/>}</div>
          <div className="flex flex-col justify-center p-7 sm:p-10"><p className="text-xs font-bold uppercase tracking-[.15em] text-sky-700">{blogLabel(featured.topic)}</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{featured.title}</h2><p className="mt-4 leading-7 text-slate-600">{featured.excerpt}</p><p className="mt-6 text-sm font-semibold text-sky-700">Read article</p></div>
        </Link>
        {rest.length ? <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{rest.map(post => <Link href={`/blog/${post.slug}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white" key={post.id}><div className="relative aspect-[16/9] bg-slate-100">{post.coverImageUrl ? <Image src={post.coverImageUrl} alt={post.coverImageAlt ?? post.title} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]"/> : <div className="absolute inset-0 bg-[#071b33]"/>}</div><div className="p-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-sky-700">{blogLabel(post.topic)}</p><h2 className="mt-2 text-xl font-bold leading-7 text-slate-950">{post.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{post.excerpt}</p></div></Link>)}</div> : null}
      </>}
    </section>
  </main>;
}
