import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogContent } from "@/components/store/blog-content";
import { blogLabel } from "@/domain/blog/constants";
import { entityMetadata, globalSeoSettings, safeJsonLd } from "@/domain/marketing/seo";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getPost(slug: string) {
  return prisma.blogPost.findFirst({ where: { slug, status: "PUBLISHED", publishedAt: { lte: new Date() } } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { robots: { index: false, follow: false } };
  return entityMetadata({ entityType: "BLOG", entityId: post.id, path: `/blog/${post.slug}`, title: post.metaTitle ?? post.title, description: post.metaDescription ?? post.excerpt, image: post.coverImageUrl, keywords: [blogLabel(post.topic), "business technology", "South Africa"] });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const global = await globalSeoSettings();
  const structured = { "@context": "https://schema.org", "@type": "Article", headline: post.title, description: post.excerpt, image: post.coverImageUrl ? [post.coverImageUrl] : undefined, datePublished: post.publishedAt?.toISOString(), dateModified: post.updatedAt.toISOString(), author: { "@type": "Organization", name: global.businessName }, publisher: { "@type": "Organization", name: global.businessName, logo: { "@type": "ImageObject", url: new URL(global.logo, global.siteUrl).toString() } }, mainEntityOfPage: new URL(`/blog/${post.slug}`, global.siteUrl).toString() };
  return <main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structured) }}/>
    <article>
      <header className="mx-auto max-w-4xl px-4 pb-9 pt-12 text-center sm:px-6 lg:pt-16"><Link href="/blog" className="text-sm font-semibold text-sky-700">Insights</Link><p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-sky-700">{blogLabel(post.topic)}</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{post.title}</h1><p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">{post.excerpt}</p><p className="mt-5 text-sm text-slate-500">{post.publishedAt?.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })} · Innozanzi editorial team</p></header>
      {post.coverImageUrl ? <div className="relative mx-auto aspect-[3/2] max-w-6xl overflow-hidden bg-slate-100 sm:rounded-2xl"><Image src={post.coverImageUrl} alt={post.coverImageAlt ?? post.title} fill priority sizes="(min-width:1200px) 1152px, 100vw" className="object-cover"/></div> : null}
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14"><BlogContent content={post.content}/></div>
    </article>
  </main>;
}
