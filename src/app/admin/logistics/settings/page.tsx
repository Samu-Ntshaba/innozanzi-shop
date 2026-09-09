import { AdminPage, Panel, buttonClass, inputClass, tableClass } from "@/components/admin/admin-ui";
import { provinces } from "@/domain/addresses/schema";
import { getDeliveryProvinces } from "@/domain/addresses/delivery-areas";
import { requirePermission } from "@/domain/auth/session";
import { saveDeliveryAreas, saveTransportSetting } from "@/domain/logistics/actions";
import { prisma } from "@/lib/prisma";

export default async function Settings() {
  await requirePermission("transport.settings.manage");
  const [categories, costs, deliveryProvinces] = await Promise.all([
    prisma.transportCategory.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.transportCostType.findMany({ orderBy: { displayOrder: "asc" } }),
    getDeliveryProvinces(),
  ]);
  const box = (kind: "category" | "cost", rows: Array<{ id: string; code: string; name: string; isActive: boolean }>) => <Panel title={kind === "category" ? "Transport categories" : "Cost component types"}>
    <form action={saveTransportSetting} className="mb-4 flex flex-wrap gap-2"><input type="hidden" name="kind" value={kind}/><input className={inputClass + " flex-1"} name="code" placeholder="Code" required/><input className={inputClass + " flex-[2]"} name="name" placeholder="Display name" required/><button className={buttonClass}>Add</button></form>
    <table className={tableClass}><thead><tr><th>Code</th><th>Name</th><th>Status</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td>{row.isActive ? "Active" : "Inactive"}</td></tr>)}</tbody></table>
  </Panel>;
  return <AdminPage title="Logistics configuration" description="Control retail delivery coverage, transport categories and cost types.">
    <Panel title="Retail delivery provinces" description="Checkout accepts only addresses in the selected provinces. Select at least one province.">
      <form action={saveDeliveryAreas}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{provinces.map(province => <label key={province} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold"><input type="checkbox" name="province" value={province} defaultChecked={deliveryProvinces.includes(province)}/>{province}</label>)}</div>
        <button className={buttonClass + " mt-4"}>Save delivery provinces</button>
      </form>
    </Panel>
    <div className="grid gap-4 xl:grid-cols-2">{box("category", categories)}{box("cost", costs)}</div>
  </AdminPage>;
}
