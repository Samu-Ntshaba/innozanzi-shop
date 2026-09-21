import { Panel, StatusBadge, inputClass } from "@/components/admin/admin-ui";
import { saveDistributorShipment } from "@/domain/orders/procurement-actions";
import { allowedSupplierProgressStatuses } from "@/domain/orders/lifecycle";

type Shipment = {id:string;status:string;deliveryCompany:string|null;trackingNumber:string|null;trackingUrl:string|null;estimatedDeliveryAt:Date|null;deliveryInstructions:string|null};
type Group = {id:string;status:string;supplierId:string;supplierReference:string|null;supplierInvoiceNumber:string|null;supplierInvoiceTotal:unknown;expectedDispatchAt:Date|null;internalNote:string|null;supplier:{companyName:string};shipments:Shipment[]};

const dateTimeInput=(value:Date|null|undefined)=>value?new Date(value.getTime()-value.getTimezoneOffset()*60_000).toISOString().slice(0,16):"";

export function OrderSupplierShipments({orderId,groups}:{orderId:string;groups:Group[]}){
  return <Panel title="Delivery & tracking" description="Record information supplied by each distributor. Innozanzi does not operate the physical delivery.">
    {groups.length?<div className="space-y-4">{groups.map(group=>{const shipment=group.shipments[0];return <div className="grid gap-4 rounded border border-slate-200 bg-slate-50 p-4" key={group.id}>
      <form action={`/api/admin/orders/${orderId}/supplier-progress`} method="post" className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="orderId" value={orderId}/><input type="hidden" name="supplierId" value={group.supplierId}/>
        <div className="flex items-center justify-between md:col-span-2"><div><h3 className="font-bold">{group.supplier.companyName}</h3><p className="text-xs text-slate-500">Supplier order and confirmation</p></div><StatusBadge value={group.status}/></div>
        <label>Supplier status<select className={`${inputClass} mt-1 w-full`} name="status" defaultValue={group.status}>{allowedSupplierProgressStatuses(group.status).map(status=><option value={status} key={status}>{status.replaceAll("_"," ")}</option>)}</select></label>
        <label>Supplier reference<input className={`${inputClass} mt-1 w-full`} name="supplierReference" defaultValue={group.supplierReference??""}/></label>
        <label>Expected dispatch<input className={`${inputClass} mt-1 w-full`} type="datetime-local" name="expectedDispatchAt" defaultValue={dateTimeInput(group.expectedDispatchAt)}/></label>
        <label>Supplier invoice/reference<input className={`${inputClass} mt-1 w-full`} name="supplierInvoiceNumber" defaultValue={group.supplierInvoiceNumber??""}/></label>
        <label>Supplier invoice total<input className={`${inputClass} mt-1 w-full`} type="number" min="0" step="0.01" name="supplierInvoiceTotal" defaultValue={group.supplierInvoiceTotal?.toString()??""}/></label>
        <label className="md:col-span-2">Private supplier note<textarea className={`${inputClass} mt-1 min-h-16 w-full`} name="internalNote" defaultValue={group.internalNote??""}/></label>
        <button className="min-h-11 border border-sky-700 bg-white px-4 font-bold text-sky-800 md:col-span-2">Save supplier order progress</button>
      </form>
      <form action={saveDistributorShipment} className="grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2">
      <input type="hidden" name="orderId" value={orderId}/><input type="hidden" name="procurementId" value={group.id}/>
      <div className="flex items-center justify-between md:col-span-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Delivery source: distributor</p><StatusBadge value={shipment?.status??"PENDING"}/></div>
      <label>Delivery status<select className={`${inputClass} mt-1 w-full`} name="status" defaultValue={shipment?.status??"PENDING"}>{["PENDING","SHIPPED","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED"].map(status=><option value={status} key={status}>{status.replaceAll("_"," ")}</option>)}</select></label>
      <label>Courier / delivery company<input className={`${inputClass} mt-1 w-full`} name="deliveryCompany" defaultValue={shipment?.deliveryCompany??""} placeholder={`${group.supplier.companyName} if not yet assigned`}/></label>
      <label>Tracking number<input className={`${inputClass} mt-1 w-full`} name="trackingNumber" defaultValue={shipment?.trackingNumber??""}/></label>
      <label>Tracking URL<input className={`${inputClass} mt-1 w-full`} type="url" name="trackingUrl" defaultValue={shipment?.trackingUrl??""}/></label>
      <label>Expected delivery<input className={`${inputClass} mt-1 w-full`} type="datetime-local" name="estimatedDeliveryAt" defaultValue={dateTimeInput(shipment?.estimatedDeliveryAt)}/></label>
      <label>Delivery time / window<input className={`${inputClass} mt-1 w-full`} name="deliveryWindow" placeholder="10:00–14:00"/></label>
      <label className="md:col-span-2">Internal distributor/delivery note<textarea className={`${inputClass} mt-1 min-h-20 w-full`} name="deliveryInstructions" defaultValue={shipment?.deliveryInstructions??""}/></label>
      <button className="min-h-11 bg-sky-700 px-4 font-bold text-white md:col-span-2">Save distributor delivery update</button>
      </form>
    </div>})}</div>:<p className="text-sm text-amber-800">Place the order with its distributor before recording delivery.</p>}
  </Panel>;
}
