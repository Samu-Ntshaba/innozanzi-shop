import { inputClass } from "@/components/admin/admin-ui";

export function OrderSupplierSetup({orderId,suppliers}:{orderId:string;suppliers:Array<{id:string;companyName:string}>}){
  if(!suppliers.length)return null;
  return <div className="space-y-3">{suppliers.map(supplier=><form action={`/api/admin/orders/${orderId}/supplier-progress`} method="post" className="grid gap-3 rounded border border-amber-200 bg-amber-50 p-4" key={supplier.id}>
    <input type="hidden" name="orderId" value={orderId}/><input type="hidden" name="supplierId" value={supplier.id}/><input type="hidden" name="status" value="SUBMITTED"/>
    <strong>{supplier.companyName} · place supplier order</strong>
    <label>Supplier order/reference number<input className={`${inputClass} mt-1 w-full`} name="supplierReference" placeholder="Can be added when the distributor confirms"/></label>
    <label>Private supplier note<textarea className={`${inputClass} mt-1 min-h-16 w-full`} name="internalNote"/></label>
    <a className="text-sm font-bold text-sky-700 underline" href={`/api/admin/orders/${orderId}/supplier-order?supplierId=${supplier.id}`} target="_blank">Download supplier order PDF</a>
    <button className="min-h-11 bg-sky-700 px-4 font-bold text-white">Record order placed with distributor</button>
  </form>)}</div>;
}
