import Link from "next/link";
import { AdminPage, EmptyState, Pagination, Panel, StatusBadge, buttonClass, inputClass, tableClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { generateBlogDraft } from "@/domain/blog/actions";
import { BLOG_AUDIENCES, BLOG_TOPICS, blogLabel } from "@/domain/blog/constants";
import { prisma } from "@/lib/prisma";

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; page?: string; generationError?: string }> }) {
  await requirePermission("marketing.content.view");
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const status = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(query.status ?? "") ? query.status : "";
  const where = {
    ...(status ? { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" } : {}),
    ...(query.search ? { OR: [{ title: { contains: query.search, mode: "insensitive" as const } }, { topic: { contains: query.search, mode: "insensitive" as const } }] } : {}),
  };
  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * 10, take: 10 }),
    prisma.blogPost.count({ where }),
  ]);
  return <AdminPage title="Blog" description="Research, review and publish useful technology articles. AI-generated work always starts as a draft.">
    {query.generationError ? <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>We could not create the article.</strong> {query.generationError === "sources" ? "The research response did not include verifiable source links. Try again with a more specific direction." : query.generationError === "timeout" ? "The research service took too long to respond. Please retry." : "The research service returned an invalid or unavailable response. Please retry; the admin workspace remains available."}</div> : null}
    <Panel title="Create an AI-assisted draft" description="Choose the subject and reader. OpenAI researches current sources and saves the article as a draft. Generate its cover image from the review page.">
      <form action={generateBlogDraft} className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">Topic<select className={`${inputClass} mt-1 w-full`} name="topic">{BLOG_TOPICS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="text-sm font-medium">Audience<select className={`${inputClass} mt-1 w-full`} name="audience">{BLOG_AUDIENCES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="text-sm font-medium md:col-span-2">Optional direction<textarea className={`${inputClass} mt-1 min-h-24 w-full`} name="direction" placeholder="Example: Explain how SMEs can choose a UPS during load shedding without overspending."/></label>
        <p className="text-xs leading-5 text-slate-500 md:col-span-2">Generation can take a minute while the article is researched and the cover is created. Review every claim and source before publishing.</p>
        <button className={`${buttonClass} md:col-span-2`}>Research and generate draft</button>
      </form>
    </Panel>
    <Panel title="Articles">
      <form className="mb-4 flex flex-wrap gap-2">
        <input className={`${inputClass} min-w-56 flex-1`} name="search" defaultValue={query.search} placeholder="Search articles"/>
        <select className={inputClass} name="status" defaultValue={status}><option value="">All statuses</option><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select>
        <button className={buttonClass}>Filter</button>
      </form>
      {posts.length ? <><table className={tableClass}><thead><tr><th>Article</th><th>Topic</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>{posts.map(post => <tr key={post.id}><td><p className="font-semibold">{post.title}</p><p className="max-w-xl truncate text-xs text-slate-500">{post.excerpt}</p></td><td>{blogLabel(post.topic)}</td><td><StatusBadge value={post.status}/></td><td>{post.updatedAt.toLocaleDateString("en-ZA")}</td><td><Link className="font-semibold text-sky-700" href={`/admin/marketing/blog/${post.id}`}>Edit</Link></td></tr>)}</tbody></table><div className="mt-4"><Pagination page={page} pageCount={Math.max(1, Math.ceil(total / 10))} total={total} query={{ search: query.search, status }}/></div></> : <EmptyState title="No articles yet" description="Generate the first sourced draft using the selectors above."/>}
    </Panel>
  </AdminPage>;
}
