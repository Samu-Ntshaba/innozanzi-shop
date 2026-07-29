import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage, Panel, buttonClass, inputClass, secondaryButtonClass } from "@/components/admin/admin-ui";
import { BlogGenerationStatus } from "@/components/admin/blog-generation-status";
import { requirePermission } from "@/domain/auth/session";
import { refreshBlogGeneration, regenerateBlogCover, saveBlogPost } from "@/domain/blog/actions";
import { BLOG_AUDIENCES, BLOG_TOPICS } from "@/domain/blog/constants";

export default async function EditBlogPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ generated?: string; generating?: string; saved?: string; image?: string }> }) {
  await requirePermission("marketing.content.view");
  const post = await refreshBlogGeneration((await params).id);
  if (!post) notFound();
  const notice = await searchParams;
  const generation = post.sources && !Array.isArray(post.sources) ? (post.sources as { generation?: { status?: string; error?: string } }).generation : null;
  const isGenerating = generation?.status === "queued" || generation?.status === "in_progress";
  const sources = Array.isArray(post.sources) ? post.sources as Array<{ title?: string; url?: string }> : [];
  return <AdminPage title="Review article" description="Edit the draft, verify its sources and preview the public page before publishing." actions={<><Link className={secondaryButtonClass} href="/admin/marketing/blog">All articles</Link>{post.status === "PUBLISHED" ? <Link className={secondaryButtonClass} href={`/blog/${post.slug}`} target="_blank">View live</Link> : null}</>}>
    {isGenerating ? <BlogGenerationStatus/> : null}
    {generation?.status === "failed" ? <p className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Article research failed. Return to the blog list and try again with a more specific direction. {generation.error ? <span className="block pt-1 text-xs">{generation.error}</span> : null}</p> : null}
    {notice.generated ? <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Draft generated. Review the content and source links before publishing.</p> : null}
    {notice.saved ? <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Article saved.</p> : null}
    {notice.image === "pending" ? <p className="border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">The text draft is safely saved. Generate its cover from the Cover image panel when you are ready.</p> : null}
    {notice.image === "failed" ? <p className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">The article was created, but the cover image could not be generated. Check OpenAI image access and Supabase storage, then retry below.</p> : null}
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Article content">
        <form action={saveBlogPost} className="grid gap-3">
          <input type="hidden" name="id" value={post.id}/>
          <label className="text-sm font-medium">Title<input className={`${inputClass} mt-1 w-full`} name="title" defaultValue={post.title} required/></label>
          <label className="text-sm font-medium">Summary<textarea className={`${inputClass} mt-1 min-h-24 w-full`} name="excerpt" defaultValue={post.excerpt} required/></label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium">Topic<select className={`${inputClass} mt-1 w-full`} name="topic" defaultValue={post.topic}>{BLOG_TOPICS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="text-sm font-medium">Audience<select className={`${inputClass} mt-1 w-full`} name="audience" defaultValue={post.audience}>{BLOG_AUDIENCES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          </div>
          <label className="text-sm font-medium">Article (Markdown)<textarea className={`${inputClass} mt-1 min-h-[34rem] w-full font-mono leading-6`} name="content" defaultValue={post.content} required/></label>
          <label className="text-sm font-medium">Cover image URL<input className={`${inputClass} mt-1 w-full`} name="coverImageUrl" defaultValue={post.coverImageUrl ?? ""}/></label>
          <label className="text-sm font-medium">Cover image alternative text<input className={`${inputClass} mt-1 w-full`} name="coverImageAlt" defaultValue={post.coverImageAlt ?? ""}/></label>
          <div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-medium">SEO title<input className={`${inputClass} mt-1 w-full`} name="metaTitle" defaultValue={post.metaTitle ?? ""}/></label><label className="text-sm font-medium">SEO description<textarea className={`${inputClass} mt-1 min-h-20 w-full`} name="metaDescription" defaultValue={post.metaDescription ?? ""}/></label></div>
          <label className="text-sm font-medium">Status<select className={`${inputClass} mt-1 w-full`} name="status" defaultValue={post.status}><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select></label>
          <p className="text-xs text-slate-500">Publishing requires the marketing content publish permission. Changing a published article back to draft removes it from the public site.</p>
          <button className={buttonClass} disabled={isGenerating}>Save article</button>
        </form>
      </Panel>
      <div className="space-y-4">
        <Panel title="Cover image">{post.coverImageUrl ? <div className="relative aspect-[3/2] overflow-hidden bg-slate-100"><Image src={post.coverImageUrl} alt={post.coverImageAlt ?? post.title} fill sizes="360px" className="object-cover"/></div> : <div className="grid aspect-[3/2] place-items-center bg-slate-100 text-sm text-slate-500">No cover image</div>}<form action={regenerateBlogCover} className="mt-3"><input type="hidden" name="id" value={post.id}/><button className={secondaryButtonClass}>Generate a new cover</button></form></Panel>
        <Panel title={`Research sources (${sources.length})`} description="Open every source and verify the related claims before publishing."><ol className="space-y-3 text-sm">{sources.map((source, index) => <li key={`${source.url}-${index}`}><a className="font-medium text-sky-700 underline" href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a><p className="mt-0.5 break-all text-xs text-slate-500">{source.url}</p></li>)}</ol></Panel>
      </div>
    </div>
  </AdminPage>;
}
