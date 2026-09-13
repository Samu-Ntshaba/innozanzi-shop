import Image from "next/image";
import Link from "next/link";
import { Section, Stat, card } from "@/components/mobile-admin/ui";
import { generateMobileSocialContent, regenerateMobileSocialContent } from "@/domain/mobile-admin/actions";
import { socialContentDate, socialContentDay } from "@/domain/marketing/social-content";
import { prisma } from "@/lib/prisma";

export default async function MobileMarketing({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const { result } = await searchParams;
  const day = socialContentDay();
  const content = await prisma.socialContent.findFirst({ where: { contentDate: socialContentDate(day), generationKey: { startsWith: `daily:${day}:` } }, orderBy: { createdAt: "desc" } });
  return <>
    <h1 className="text-3xl font-black text-[#071b33]">Daily marketing</h1>
    <p className="mt-1 text-sm text-slate-500">One strong product post for South African customers.</p>
    {result ? <p className={`mt-4 rounded-xl p-3 text-sm font-bold ${result === "failed" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{result === "failed" ? "Content generation failed. Open the full workspace for details." : result === "regenerated" ? "Today’s post was replaced successfully." : result === "already-generated" ? "Today’s post is already ready." : "Today’s post was generated."}</p> : null}
    <div className="mt-5 grid grid-cols-2 gap-3"><Stat label="Posts today" value={content ? 1 : 0} tone="blue"/><Stat label="Daily target" value="1" tone={content ? "green" : "amber"}/></div>
    <div className="mt-4 grid gap-3">
      <form action={generateMobileSocialContent}><button className="min-h-12 w-full rounded-xl bg-[#0a6ed1] px-4 text-sm font-black text-white">{content ? "Check today’s post" : "Generate today’s post"}</button></form>
      <form action={regenerateMobileSocialContent}><button className="min-h-12 w-full rounded-xl border border-sky-700 bg-white px-4 text-sm font-black text-sky-800">Regenerate today’s post</button></form>
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-500">Regeneration replaces today’s post and emails the new version. Nothing is published automatically.</p>
    <Section title="Today’s post"><div className={card}>{content ? <article className="p-4"><a href={content.imageUrl} target="_blank" rel="noreferrer" className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-slate-100"><Image src={content.imageUrl} alt={content.imageAlt} fill sizes="(max-width: 768px) 100vw, 420px" className="object-cover"/></a><span className="mt-4 block text-[10px] font-black uppercase text-sky-700">Daily product</span><h2 className="mt-1 text-base font-black text-slate-900">{content.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{content.caption}</p><div className="mt-3 flex justify-end"><a href={content.imageUrl} target="_blank" rel="noreferrer" download className="min-h-10 px-3 py-2 text-xs font-bold text-sky-700">Download full-size image</a></div></article> : <p className="p-5 text-sm text-slate-500">No post has been generated today.</p>}</div></Section>
    <Link href="/admin/marketing/social" className="mt-5 block min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700">Open content library</Link>
  </>;
}
