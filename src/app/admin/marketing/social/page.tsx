import Image from "next/image";
import Link from "next/link";
import { AdminPage, EmptyState, Panel, StatusBadge, buttonClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { generateSocialContentNow } from "@/domain/marketing/social-actions";
import { prisma } from "@/lib/prisma";
const labels: Record<string, string> = { PRODUCT: "Product spotlight", SPECIAL: "Product special", PC_BUILDER: "Build a PC", GAMING: "Gaming", INSIGHT: "Blog insight" };

export default async function SocialMarketingPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  await requirePermission("marketing.content.view"); const { result } = await searchParams;
  const items = await prisma.socialContent.findMany({ orderBy: [{ contentDate: "desc" }, { createdAt: "desc" }], take: 80 });
  return <AdminPage title="Social media" description="Four branded, human-sounding posts are prepared every day and emailed for manual publishing." actions={<Link className="text-sm font-semibold text-sky-700" href="/admin/marketing/settings">Settings</Link>}>
    {result === "generated" ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Today’s four posts were created and emailed.</p> : null}
    {result === "already-generated" ? <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-800">Today’s content already exists, so nothing was repeated.</p> : null}
    {result === "failed" ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Generation failed. Check the recipient, OpenAI, storage and email configuration, then try again.</p> : null}
    <Panel title="Daily content plan" description="The system always creates one useful post in each category. Product sources are rotated so recent subjects are not needlessly repeated."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{["Product spotlight", "Current special", "Build a PC", "Gaming"].map((label, index) => <div className="rounded-lg border border-slate-200 p-4" key={label}><span className="text-xs font-black text-sky-700">POST {index + 1}</span><h3 className="mt-1 font-bold">{label}</h3></div>)}</div><form action={generateSocialContentNow} className="mt-5"><button className={buttonClass}>Generate today’s posts now</button></form></Panel>
    <Panel title="Content history" description="Every generated image and caption is saved here, including extra social posts created for blog insights.">{items.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map(item => <article className="overflow-hidden rounded-xl border border-slate-200 bg-white" key={item.id}><div className="relative aspect-square bg-slate-100"><Image src={item.imageUrl} alt={item.imageAlt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover"/></div><div className="p-4"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black uppercase text-sky-700">{labels[item.contentType] ?? item.contentType}</span><StatusBadge value={item.emailStatus}/></div><h3 className="mt-2 font-bold">{item.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.caption}</p><div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{item.contentDate.toLocaleDateString("en-ZA")}</span><a className="font-semibold text-sky-700" href={item.imageUrl} target="_blank" rel="noreferrer">Full-size image</a></div></div></article>)}</div> : <EmptyState title="No social content yet" description="Configure the recipient, then generate the first four posts."/>}</Panel>
  </AdminPage>;
}
