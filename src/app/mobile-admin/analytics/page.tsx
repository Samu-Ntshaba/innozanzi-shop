import Link from "next/link";
import { requirePermission } from "@/domain/auth/session";
import { Row, Section, Stat, card } from "@/components/mobile-admin/ui";
import {
  googleAnalyticsConfiguration,
  realtimeDevices,
  realtimeLocations,
  realtimeOverview,
  realtimePages,
  recentPages,
  recentSources,
  recentSummary,
  type AnalyticsTable,
} from "@/lib/google-analytics-data";

export const dynamic = "force-dynamic";

const resolved = <T,>(item: PromiseSettledResult<T>) => item.status === "fulfilled" ? item.value : null;
function metric(report: AnalyticsTable | null, name: string) {
  const index = report?.metrics.indexOf(name) ?? -1;
  return report && index >= 0 ? report.totals[index] ?? report.rows[0]?.metrics[index] ?? 0 : 0;
}

export default async function MobileAnalytics() {
  await requirePermission("marketing.analytics.view");
  const configuration = googleAnalyticsConfiguration();
  if (!configuration.configured) return <><h1 className="text-3xl font-black text-[#071b33]">Analytics</h1><p className="mt-1 text-sm text-slate-500">Storefront traffic from Google Analytics 4.</p><div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><p className="text-xs font-black uppercase tracking-[.14em]">Reporting connection needed</p><h2 className="mt-2 text-lg font-black">Tracking is installed, but reports cannot be read yet</h2><p className="mt-2 text-sm leading-6">Add the GA4 Property ID and a read-only Google service account to Railway. The measurement tag alone can collect traffic but cannot read it back into Mobile Admin.</p><div className="mt-4 rounded-xl bg-white/70 p-3 font-mono text-xs leading-6"><p>GA4_PROPERTY_ID</p><p>GOOGLE_ANALYTICS_CREDENTIALS_JSON</p></div><Link href="/admin/marketing/analytics" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#071b33] px-4 text-sm font-bold text-white">View connection guide</Link></div></>;

  const reports = await Promise.allSettled([realtimeOverview(),realtimePages(),realtimeLocations(),realtimeDevices(),recentSummary(),recentPages(),recentSources()]);
  const [live,livePages,locations,devices,summary,pages,sources]=reports.map(resolved);
  return <><div className="flex items-end justify-between"><div><h1 className="text-3xl font-black text-[#071b33]">Analytics</h1><p className="mt-1 text-sm text-slate-500">Live and recent storefront traffic.</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">GA4</span></div>{reports.some(report=>report.status==="rejected")?<p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Some Google reports could not load. Available data is shown.</p>:null}<div className="mt-5 grid grid-cols-2 gap-3"><Stat label="Active now" value={metric(live,"activeUsers")} tone="green"/><Stat label="Visitors · 30 days" value={metric(summary,"activeUsers")} tone="blue"/><Stat label="New visitors" value={metric(summary,"newUsers")} tone="blue"/><Stat label="Page views" value={metric(summary,"screenPageViews")} tone="blue"/></div><Section title="Pages viewed now"><div className={card}>{livePages?.rows.length?livePages.rows.slice(0,10).map((row,index)=><Row key={`${row.dimensions[0]}-${index}`} href={row.dimensions[0]||"/"} title={row.dimensions[0]||"Unknown page"} meta={`${row.metrics[0]} active · ${row.metrics[1]} views`} badge="LIVE"/>):<p className="p-5 text-sm text-slate-500">No active page views right now.</p>}</div></Section><Section title="Popular pages · 30 days"><div className={card}>{pages?.rows.length?pages.rows.slice(0,10).map((row,index)=><Row key={`${row.dimensions[0]}-${index}`} href={row.dimensions[0]||"/"} title={row.dimensions[1]||row.dimensions[0]||"Unknown page"} meta={`${row.metrics[0]} views · ${row.metrics[1]} visitors`}/>):<p className="p-5 text-sm text-slate-500">No processed page history yet.</p>}</div></Section><Section title="Traffic sources"><div className={card}>{sources?.rows.length?sources.rows.slice(0,8).map((row,index)=><div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0" key={`${row.dimensions[0]}-${index}`}><p className="min-w-0 truncate text-sm font-bold text-slate-800">{row.dimensions[0]||"Direct"}</p><span className="shrink-0 text-xs text-slate-500">{row.metrics[0]} sessions</span></div>):<p className="p-5 text-sm text-slate-500">No acquisition data yet.</p>}</div></Section><Section title="Live audience"><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">Devices</p>{devices?.rows.map((row,index)=><div key={`${row.dimensions[0]}-${index}`} className="mt-3 flex justify-between text-sm"><span className="capitalize">{row.dimensions[0]}</span><strong>{row.metrics[0]}</strong></div>)}</div><div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">Locations</p>{locations?.rows.slice(0,5).map((row,index)=><div key={`${row.dimensions.join("-")}-${index}`} className="mt-3 flex justify-between gap-2 text-sm"><span className="truncate">{row.dimensions[1]||row.dimensions[0]||"Unknown"}</span><strong>{row.metrics[0]}</strong></div>)}</div></div></Section><Link href="/admin/marketing/analytics" className="mt-6 block min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700">Open detailed analytics</Link></>;
}
