import { AdminPage, EmptyState, MetricCard, Panel, tableClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
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

export default async function AnalyticsPage() {
  await requirePermission("marketing.analytics.view");
  const configuration = googleAnalyticsConfiguration();
  if (!configuration.configured) return <AdminPage title="Website analytics" description="Live and historical storefront traffic from Google Analytics 4.">
    <Panel title="Connect Google Analytics" description="The storefront tracking tag is active. Add read-only reporting credentials to display its data here.">
      <div className="max-w-3xl space-y-5 text-sm leading-6 text-slate-700">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Copy the numeric <strong>Property ID</strong> from Google Analytics Admin → Property settings.</li>
          <li>Create a Google Cloud service account and enable the Google Analytics Data API.</li>
          <li>Add the service-account email as a <strong>Viewer</strong> on the GA4 property.</li>
          <li>Add these Railway variables and redeploy:</li>
        </ol>
        <div className="overflow-x-auto bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
          <div>GA4_PROPERTY_ID=123456789</div>
          <div>GOOGLE_ANALYTICS_CREDENTIALS_JSON={'{"client_email":"...","private_key":"..."}'}</div>
        </div>
        <p className="text-xs text-slate-500">The credential stays on the server. The existing G- measurement ID cannot read reports by itself.</p>
      </div>
    </Panel>
  </AdminPage>;

  const reports = await Promise.allSettled([
    realtimeOverview(), realtimePages(), realtimeLocations(), realtimeDevices(),
    recentSummary(), recentPages(), recentSources(),
  ]);
  const [live, livePages, locations, devices, summary, pages, sources] = reports.map(resolved);
  return <AdminPage title="Website analytics" description="Live visitors, viewed pages, acquisition and 30-day storefront performance from Google Analytics 4.">
    {reports.some(item => item.status === "rejected") ? <p className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Some reports could not be loaded. Available data is shown below; check the service account’s Viewer access if this continues.</p> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Active now" value={metric(live, "activeUsers")} detail="Last 30 minutes"/>
      <MetricCard label="Visitors" value={metric(summary, "activeUsers")} detail="Last 30 days"/>
      <MetricCard label="New visitors" value={metric(summary, "newUsers")} detail="Last 30 days"/>
      <MetricCard label="Page views" value={metric(summary, "screenPageViews")} detail="Last 30 days"/>
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <Panel title="Pages being viewed now" description="Activity during the last 30 minutes.">
        {livePages?.rows.length ? <table className={tableClass}><thead><tr><th>Page</th><th>Active visitors</th><th>Views</th></tr></thead><tbody>{livePages.rows.map((row, index) => <tr key={`${row.dimensions[0]}-${index}`}><td className="font-medium">{row.dimensions[0] || "Unknown page"}</td><td>{row.metrics[0]}</td><td>{row.metrics[1]}</td></tr>)}</tbody></table> : <EmptyState title="No active page views" description="Current pages will appear within seconds when visitors are active."/>}
      </Panel>
      <Panel title="Active locations" description="Approximate visitor locations from Google Analytics.">
        {locations?.rows.length ? <div className="divide-y divide-slate-200">{locations.rows.map((row, index) => <div className="flex justify-between gap-4 py-3 text-sm" key={`${row.dimensions.join("-")}-${index}`}><span><strong>{row.dimensions[1] || "Unknown city"}</strong><span className="block text-xs text-slate-500">{row.dimensions[0] || "Unknown country"}</span></span><strong>{row.metrics[0]}</strong></div>)}</div> : <EmptyState title="No live locations" description="Locations will appear when visitors are active."/>}
      </Panel>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Most viewed pages" description="Last 30 days.">
        {pages?.rows.length ? <table className={tableClass}><thead><tr><th>Page</th><th>Views</th><th>Visitors</th></tr></thead><tbody>{pages.rows.map((row, index) => <tr key={`${row.dimensions[0]}-${index}`}><td><p className="font-medium">{row.dimensions[1] || row.dimensions[0]}</p><p className="max-w-md truncate text-xs text-slate-500">{row.dimensions[0]}</p></td><td>{row.metrics[0]}</td><td>{row.metrics[1]}</td></tr>)}</tbody></table> : <EmptyState title="No page history yet" description="Page performance appears after GA4 processes traffic."/>}
      </Panel>
      <div className="space-y-4">
        <Panel title="Traffic sources" description="Where sessions came from during the last 30 days.">
          {sources?.rows.length ? <div className="divide-y divide-slate-200">{sources.rows.map((row, index) => <div className="flex justify-between gap-4 py-3 text-sm" key={`${row.dimensions[0]}-${index}`}><span className="min-w-0 truncate font-medium">{row.dimensions[0] || "(direct) / (none)"}</span><span className="whitespace-nowrap text-slate-600">{row.metrics[0]} sessions</span></div>)}</div> : <EmptyState title="No acquisition data yet" description="Traffic sources appear after Google processes sessions."/>}
        </Panel>
        <Panel title="Active devices" description="Devices used during the last 30 minutes.">
          {devices?.rows.length ? <div className="grid grid-cols-3 gap-3">{devices.rows.map((row, index) => <div className="border border-slate-200 p-3 text-center" key={`${row.dimensions[0]}-${index}`}><p className="text-xl font-semibold">{row.metrics[0]}</p><p className="mt-1 text-xs capitalize text-slate-500">{row.dimensions[0]}</p></div>)}</div> : <EmptyState title="No active devices" description="Device activity appears with live visitors."/>}
        </Panel>
      </div>
    </div>
  </AdminPage>;
}
