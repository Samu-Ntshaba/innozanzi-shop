import Link from "next/link";
import { AdminPage, MetricCard, Panel, secondaryButtonClass } from "@/components/admin/admin-ui";
import { TestModeControl } from "@/components/admin/test-mode-control";
import { requireUser } from "@/domain/auth/session";
import { testDataCounts } from "@/domain/test-mode/data";
import { isTestModeEnvironment, testModeUrl } from "@/lib/test-mode";
import { redirect } from "next/navigation";

export default async function TestModePage(){
  const context=await requireUser();
  if(!context.isSuperAdministrator)redirect("/unauthorized");
  const enabled=isTestModeEnvironment();
  const counts=enabled?await testDataCounts():{products:0,customers:0,quotes:0,orders:0,tickets:0,rfqs:0};
  const remote=testModeUrl("/admin/test-mode");
  return <AdminPage title="Test Mode" description="A production-equivalent workspace backed by a separate disposable database. Live customer records are never read, changed or deleted." actions={!enabled&&remote?<Link className={secondaryButtonClass} href={remote}>Open isolated Test Mode</Link>:undefined}>
    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6"><MetricCard label="Products" value={counts.products}/><MetricCard label="Customers" value={counts.customers}/><MetricCard label="Quotations" value={counts.quotes}/><MetricCard label="Orders" value={counts.orders}/><MetricCard label="Tickets" value={counts.tickets}/><MetricCard label="RFQs" value={counts.rfqs}/></div>
    <Panel title={enabled?"Isolated test-data control":"Live environment protection"} description={enabled?"Generation uses the same fixed records every time. Cleanup removes business data but preserves staff access, roles, permissions, departments and system settings.":"Generation and deletion are disabled here. Configure TEST_MODE_URL to point to a second deployment with its own database."}><TestModeControl enabled={enabled}/></Panel>
    <Panel title="Fixed test login"><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Customer email</dt><dd className="font-mono font-bold">test.customer@innozanzi.local</dd></div><div><dt className="text-slate-500">Password</dt><dd className="font-mono font-bold">TestMode!2026</dd></div></dl><p className="mt-3 text-xs text-slate-500">These credentials exist only after generation and only inside the isolated Test Mode deployment.</p></Panel>
  </AdminPage>;
}
