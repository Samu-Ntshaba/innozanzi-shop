import { inputClass } from "@/components/admin/admin-ui";
import { assignOrderItemDistributor } from "@/domain/orders/procurement-actions";

type Item = { id: string; productName: string; sku: string; supplierSku: string | null; costPrice: string | null };
type Distributor = { id: string; companyName: string };

export function OrderDistributorAssignment({ orderId, items, distributors }: { orderId: string; items: Item[]; distributors: Distributor[] }) {
  if (!items.length) return null;
  return <section id="distributor-assignment" className="scroll-mt-20 border border-amber-300 bg-amber-50 p-4">
    <h2 className="text-lg font-bold text-amber-950">Assign a distributor</h2>
    <p className="mt-1 text-sm text-amber-900">Choose who will supply and deliver each product. This does not change the customer’s product, quantity or selling price.</p>
    {distributors.length ? <div className="mt-4 space-y-4">{items.map(item => <form action={assignOrderItemDistributor} className="grid gap-3 border border-amber-200 bg-white p-4 md:grid-cols-2" key={item.id}>
      <input type="hidden" name="orderId" value={orderId}/><input type="hidden" name="itemId" value={item.id}/>
      <div className="md:col-span-2"><strong>{item.productName}</strong><p className="text-xs text-slate-500">Order SKU: {item.sku}</p></div>
      <label>Approved distributor<select className={`${inputClass} mt-1 w-full`} name="supplierId" required><option value="">Select distributor</option>{distributors.map(distributor=><option key={distributor.id} value={distributor.id}>{distributor.companyName}</option>)}</select></label>
      <label>Supplier SKU/reference<input className={`${inputClass} mt-1 w-full`} name="supplierSku" defaultValue={item.supplierSku??item.sku} required/></label>
      <label>Supplier unit cost (optional)<input className={`${inputClass} mt-1 w-full`} type="number" min="0" step="0.01" name="costPrice" defaultValue={item.costPrice??""}/></label>
      <label>Private assignment note<input className={`${inputClass} mt-1 w-full`} name="internalNote" placeholder="Why this distributor was selected"/></label>
      <button className="min-h-11 bg-sky-700 px-4 font-bold text-white md:col-span-2">Assign distributor and continue</button>
    </form>)}</div>:<p className="mt-4 rounded border border-red-200 bg-red-50 p-3 font-semibold text-red-800">No approved purchasing distributor is available. Approve and enable one under Suppliers before this order can continue.</p>}
  </section>;
}
