import Image from "next/image";
import Link from "next/link";
import { AdminPage, EmptyState, Panel, buttonClass, inputClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { generateSocialContentNow, regenerateSocialContentToday } from "@/domain/marketing/social-actions";
import { DAILY_SOCIAL_TYPES, socialContentDate, socialContentDay, socialGenerationReadiness } from "@/domain/marketing/social-content";
import { prisma } from "@/lib/prisma";

const labels: Record<string, string> = { PRODUCT: "Daily product", SPECIAL: "Legacy special", PC_BUILDER: "Legacy PC Builder", GAMING: "Legacy gaming", INSIGHT: "Blog insight" };
const failures: Record<string, string> = {
  CATALOGUE: "The system could not select an in-stock catalogue product with a usable image.",
  COPY: "OpenAI could not create the caption. Check API access, model availability or billing, then retry.",
  PRODUCT_ARTWORK: "The supplier product image could not be downloaded or prepared.",
  STORAGE: "The clean full-size image could not be saved to storage.",
  EMAIL: "The post was created, but email delivery failed. Retry to process the saved content.",
  INTERNAL: "An internal generation step failed. Retry once; if it persists, review the server log.",
};

export default async function SocialMarketingPage({ searchParams }: { searchParams: Promise<{ result?: string; stage?: string; type?: string; date?: string; search?: string }> }) {
  await requirePermission("marketing.content.view");
  const { result, stage, type, date, search } = await searchParams;
  const selectedType = type && [...DAILY_SOCIAL_TYPES, "INSIGHT", "SPECIAL"].includes(type) ? type : "ALL";
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? date : "";
  const query = (search ?? "").trim().slice(0, 100);
  const today = socialContentDate(socialContentDay());
  const [items, todayPost, readiness] = await Promise.all([
    prisma.socialContent.findMany({ where: { contentType: selectedType === "ALL" ? undefined : selectedType, contentDate: selectedDate ? socialContentDate(selectedDate) : undefined, OR: query ? [{ title: { contains: query, mode: "insensitive" } }, { caption: { contains: query, mode: "insensitive" } }] : undefined }, orderBy: [{ contentDate: "desc" }, { createdAt: "desc" }], take: 80 }),
    prisma.socialContent.findFirst({ where: { contentDate: today, generationKey: { startsWith: `daily:${socialContentDay()}:` } }, orderBy: { createdAt: "desc" } }),
    socialGenerationReadiness(),
  ]);

  return <AdminPage title="Social media" description="One useful, ready-to-post social image and caption is prepared each day for South African customers." actions={<Link className="text-sm font-semibold text-sky-700" href="/admin/marketing/settings">Settings</Link>}>
    {result === "generated" ? <Notice tone="success">Today’s post was created successfully.</Notice> : null}
    {result === "regenerated" ? <Notice tone="success">Today’s post was replaced with a fresh product, clean image and new caption.</Notice> : null}
    {result === "already-generated" ? <Notice tone="info">Today’s post already exists. Use “Regenerate today’s post” if you want a replacement.</Notice> : null}
    {result === "failed" ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800"><strong>Generation failed at {stage?.replaceAll("_", " ").toLowerCase() ?? "an internal step"}.</strong> {failures[stage ?? "INTERNAL"] ?? failures.INTERNAL}</p> : null}

    <Panel title="Generation services" description="The daily post uses live supplier photography; AI writes the caption but does not generate or write on the image."><div className="grid gap-2 sm:grid-cols-2">{Object.entries({ "Caption generation": readiness.openai, "Image storage": readiness.storage }).map(([label, ready]) => <div className={`rounded-lg border p-3 text-sm font-bold ${ready ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`} key={label}>{label}: {ready ? "Ready" : "Missing"}</div>)}</div></Panel>

    <Panel title="One strong post each day" description="The system rotates through in-stock products, useful customer angles and a small set of clean visual treatments. Most days stay minimal; selected days use a subtle colour shift or the genuine Innozanzi mark—never generated writing, fake interfaces or promotional claims.">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><span className="text-xs font-black uppercase tracking-wide text-sky-700">Daily post</span><h3 className="mt-1 font-bold">Useful, varied product discovery</h3><p className="mt-1 text-sm text-slate-600">Real catalogue image · changing tone and hook · product link · focused local hashtags</p></div>
      <div className="mt-5 flex flex-wrap gap-3">
        <form action={generateSocialContentNow}><button className={buttonClass}>{todayPost ? "Check today’s post" : "Generate today’s post"}</button></form>
        <form action={regenerateSocialContentToday}><button className="rounded-lg border border-sky-700 bg-white px-4 py-2 text-sm font-bold text-sky-800 hover:bg-sky-50">Regenerate today’s post</button></form>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">Regeneration replaces today’s saved post; it does not create a second one and never publishes automatically.</p>
    </Panel>

    <Panel title="Find content" description="Filter the saved library without exposing background email or delivery processing."><form className="grid gap-3 sm:grid-cols-[1fr_180px_180px_auto]" method="get"><input className={inputClass} name="search" defaultValue={query} placeholder="Search titles or captions"/><select className={inputClass} name="type" defaultValue={selectedType}><option value="ALL">All content</option>{[...DAILY_SOCIAL_TYPES, "INSIGHT", "SPECIAL"].map(value => <option value={value} key={value}>{labels[value] ?? value}</option>)}</select><input className={inputClass} type="date" name="date" defaultValue={selectedDate}/><button className={buttonClass}>Apply filters</button></form>{query || selectedDate || selectedType !== "ALL" ? <Link href="/admin/marketing/social" className="mt-3 inline-block text-sm font-bold text-sky-700">Clear filters</Link> : null}</Panel>

    <Panel title="Content library" description={`${items.length} matching post${items.length === 1 ? "" : "s"}.`}>{items.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map(item => <article className="overflow-hidden rounded-xl border border-slate-200 bg-white" key={item.id}><div className="relative aspect-[4/5] bg-slate-100"><Image src={item.imageUrl} alt={item.imageAlt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover"/></div><div className="p-4"><span className="text-xs font-black uppercase text-sky-700">{labels[item.contentType] ?? item.contentType}</span><h3 className="mt-2 font-bold">{item.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.caption}</p><div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{item.contentDate.toLocaleDateString("en-ZA")}</span><a className="font-semibold text-sky-700" href={item.imageUrl} target="_blank" rel="noreferrer" download>Download image</a></div></div></article>)}</div> : <EmptyState title="No matching social content" description="Change the filters or generate today’s post."/>}</Panel>
  </AdminPage>;
}

function Notice({ children, tone }: { children: React.ReactNode; tone: "success" | "info" }) { return <p className={`rounded-lg p-3 text-sm ${tone === "success" ? "bg-emerald-50 text-emerald-800" : "bg-sky-50 text-sky-800"}`}>{children}</p>; }
