import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/domain/auth/session";
import { runSyntechFullSync, runSyntechIncrementalSync, testSyntechConnection } from "@/domain/admin/syntech-actions";
import { AdminPage, Panel, buttonClass, secondaryButtonClass, StatusBadge, tableClass } from "@/components/admin/admin-ui";

const MAX_FEED_AGE_MS=36*60*60*1000;

export default async function Page(){
  await requirePermission("products.update");
  const [feeds,runs,count,clock]=await Promise.all([
    prisma.supplierFeed.findMany({where:{provider:{in:["SYNTECH","PINNACLE"]}},include:{supplier:true},orderBy:{provider:"asc"}}),
    prisma.supplierSyncRun.findMany({where:{feed:{provider:{in:["SYNTECH","PINNACLE"]}}},include:{feed:{select:{provider:true}}},orderBy:{startedAt:"desc"},take:20}),
    prisma.supplierCatalogueProduct.count({where:{active:true,displayPreferred:true,feed:{provider:{in:["SYNTECH","PINNACLE"]}}}}),
    prisma.$queryRaw<Array<{now:Date}>>`SELECT NOW() AS now`,
  ]);
  const configured=Boolean(process.env.SYNTECH_FULL_FEED_URL&&process.env.SYNTECH_UPDATE_FEED_URL&&process.env.PINNACLE_XML_FEED_URL);
  const latest=runs[0];
  const fresh=feeds.length===2&&feeds.every(feed=>feed.lastSuccessAt&&clock[0].now.getTime()-feed.lastSuccessAt.getTime()<=MAX_FEED_AGE_MS);
  const healthy=configured&&fresh&&latest?.status==="SUCCEEDED"&&feeds.every(feed=>!feed.lastError);
  const healthMessage=!configured
    ?"Feed credentials are not configured."
    :!fresh
      ?"One or more supplier catalogues are stale. Check or redeploy the Railway supplier cron before relying on stock or promotions."
      :feeds.find(feed=>feed.lastError)?.lastError??"A successful feed run has not been recorded.";

  return <AdminPage title="Supplier feed management" description="Monitor the combined Syntech and Pinnacle catalogue, stock and price refresh.">
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel title="Supplier status"><p className="text-2xl font-bold">{configured?"Connected":"Configuration required"}</p><p className="mt-2 text-sm text-slate-600">{count.toLocaleString("en-ZA")} active cached products</p><form action={testSyntechConnection} className="mt-4"><button className={secondaryButtonClass}>Test configuration</button></form></Panel>
      <Panel title="Daily synchronisation"><div className="text-sm text-slate-600">{feeds.map(feed=><p key={feed.id}>{feed.provider}: {feed.lastSuccessAt?.toLocaleString("en-ZA")??"Never"}</p>)}</div><div className="mt-4 flex flex-wrap gap-2"><form action={runSyntechIncrementalSync}><button disabled={!configured} className={buttonClass}>Refresh all prices now</button></form><form action={runSyntechFullSync}><button disabled={!configured} className={secondaryButtonClass}>Rebuild both catalogues</button></form></div></Panel>
      <Panel title="Feed health"><p className="text-sm text-slate-600">Production should perform one authoritative full refresh every day. Use the compact update feed only when prices or stock need another refresh during the day.</p>{healthy?<p className="mt-3 text-sm font-semibold text-emerald-700">Catalogue refreshed within the last 36 hours</p>:<p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{healthMessage}</p>}</Panel>
    </div>
    <Panel title="Recent synchronisations"><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Supplier</th><th>Started</th><th>Mode</th><th>Status</th><th>Received</th><th>Added</th><th>Updated</th><th>Removed</th><th>Skipped</th></tr></thead><tbody>{runs.map(run=><tr key={run.id}><td>{run.feed.provider}</td><td>{run.startedAt.toLocaleString("en-ZA")}</td><td>{run.mode}</td><td><StatusBadge value={run.status}/></td><td>{run.recordsReceived}</td><td>{run.recordsAdded}</td><td>{run.recordsUpdated}</td><td>{run.recordsRemoved}</td><td>{run.recordsSkipped}</td></tr>)}</tbody></table>{!runs.length?<p className="py-8 text-center text-sm text-slate-500">No synchronisations have run.</p>:null}</div></Panel>
    <Panel title="Production policy"><ul className="list-disc space-y-2 pl-5 text-sm text-slate-600"><li>Supplier cost and recommended retail values remain visible only to authorised staff.</li><li>The public price is calculated by Innozanzi and never exposes the supplier cost.</li><li>The storefront reads a local catalogue cache, so a supplier outage does not directly break browsing.</li><li>The daily full sync discovers new products and removes products absent from the authoritative feed.</li><li>Orders preserve the exact product, price and supplier references used at checkout.</li></ul></Panel>
  </AdminPage>;
}
