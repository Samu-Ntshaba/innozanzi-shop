import Link from "next/link";
import { Download, FileText, Image as ImageIcon } from "lucide-react";
import { AdminPage, Panel } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { marketingResources } from "@/domain/marketing/resources";

const assets=[
  {label:"Primary shop logo",href:"/brand/innozanzi-shop-logo.png",note:"PNG · schema, presentations and general use"},
  {label:"Header logo",href:"/brand/innozanzi-shop-logo-header-v2.png",note:"PNG · light backgrounds and documents"},
  {label:"White logo",href:"/brand/innozanzi-shop-logo-white.png",note:"PNG · dark backgrounds"},
  {label:"Square brand mark",href:"/brand/innozanzi-shop-mark.png",note:"PNG · avatars and square placements"},
  {label:"Google OAuth mark",href:"/brand/innozanzi-google-oauth-logo-120.png",note:"PNG · 120 × 120"},
  {label:"Social sharing artwork",href:"/social/innozanzi-share.png",note:"PNG · 1200 × 630 social preview"},
] as const;

export default async function MarketingResourcesPage(){await requirePermission("marketing.content.view");return <AdminPage title="Marketing resources" description="The controlled brand, positioning and campaign handover pack for employees, agencies and marketing partners."><div className="grid gap-4 lg:grid-cols-2">{marketingResources.map(resource=><article className="flex flex-col border border-slate-200 bg-white p-5 shadow-sm" key={resource.slug}><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700"><FileText className="size-5"/></span><div><h2 className="font-bold text-slate-950">{resource.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{resource.summary}</p></div></div><p className="mt-4 text-xs text-slate-500">For: {resource.audience}</p><Link className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#071b33] px-4 text-sm font-bold text-white" href={`/api/admin/marketing-resources/${resource.slug}`}><Download className="size-4"/>Download branded document</Link></article>)}</div><Panel title="Approved logo and campaign assets" description="Download the original file. Do not screenshot, stretch or recolour logos."><div className="grid gap-3 sm:grid-cols-2">{assets.map(asset=><a className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 hover:border-sky-400" download href={asset.href} key={asset.href}><ImageIcon className="size-5 shrink-0 text-sky-700"/><span className="min-w-0 flex-1"><strong className="block text-sm">{asset.label}</strong><span className="block text-xs text-slate-500">{asset.note}</span></span><Download className="size-4 text-slate-400"/></a>)}</div></Panel><Panel title="How to use this pack"><ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600"><li>Start with Company Story &amp; Positioning.</li><li>Apply Brand Standards to every visual and message.</li><li>Use the Product &amp; Experience Playbook to choose what to promote.</li><li>Plan channels with the Paid &amp; Social Guide and SEO Framework.</li><li>Measure the outcomes listed in the Marketing Manager Brief.</li></ol></Panel></AdminPage>}
