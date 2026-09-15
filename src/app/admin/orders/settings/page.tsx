import { AdminPage, Panel } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { automaticPaidOrderProcessing } from "@/domain/orders/settings";
import { saveOrderOperationsSettings } from "@/domain/orders/settings-actions";

export default async function OrderOperationsSettings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requirePermission("settings.manage");
  const [enabled, query] = await Promise.all([automaticPaidOrderProcessing(), searchParams]);
  return <AdminPage title="Order operations settings" description="Control fulfilment after authoritative payment verification.">
    {query.saved ? <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">Order operations settings saved.</p> : null}
    <Panel title="Automatic paid-order processing">
      <form action={saveOrderOperationsSettings} className="grid max-w-3xl gap-4">
        <label className="flex items-start gap-3 rounded border border-slate-200 p-4"><input className="mt-1" name="automaticPaidProcessing" type="checkbox" defaultChecked={enabled}/><span><strong>Automatically process healthy paid orders</strong><small className="mt-1 block text-slate-600">Payment verification always remains automatic. When enabled, only orders that pass available stock, supplier and commercial checks move directly to Processing. Exceptions remain at Payment Verified and are flagged for review.</small></span></label>
        <button className="min-h-11 bg-sky-700 px-5 font-bold text-white">Save setting</button>
      </form>
    </Panel>
  </AdminPage>;
}
