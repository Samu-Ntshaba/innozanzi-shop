import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { allowedOrderTransitions, orderStageContext } from "@/domain/orders/lifecycle";
import { setOrderStatus } from "@/domain/admin/actions";
import { OrderSupplierShipments } from "@/components/admin/order-supplier-shipments";
import { OrderSupplierSetup } from "@/components/admin/order-supplier-setup";
import { OrderAddressChange } from "@/components/admin/order-address-change";
import { inputClass } from "@/components/admin/admin-ui";
import { card, money, Section } from "@/components/mobile-admin/ui";

export default async function MobileOrderDetail({params}:{params:Promise<{id:string}>}){
  await requirePermission("orders.view");
  const order=await prisma.order.findUnique({where:{id:(await params).id},include:{items:true,addresses:true,payments:{orderBy:{createdAt:"desc"}},procurements:{include:{supplier:true,shipments:{orderBy:{createdAt:"desc"}}},orderBy:{createdAt:"asc"}},deliveryEvents:{orderBy:{occurredAt:"desc"}}}});
  if(!order)notFound();
  const supplierIds=[...new Set(order.items.map(item=>item.supplierId).filter((id):id is string=>Boolean(id)))];
  const missingSupplierIds=supplierIds.filter(id=>!order.procurements.some(group=>group.supplierId===id));
  const missingSuppliers=await prisma.supplier.findMany({where:{id:{in:missingSupplierIds}},select:{id:true,companyName:true}});
  const stage=orderStageContext(order.status),address=order.addresses.find(item=>item.type==="DELIVERY"||item.type==="BOTH");
  const transitions=allowedOrderTransitions(order.status).filter(status=>status!=="CANCELLED"&&!(["DISPATCHED","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED"].includes(status)));
  return <><div className="flex items-center justify-between gap-3"><div><Link href="/mobile-admin/orders" className="text-sm font-bold text-sky-700">← Orders</Link><h1 className="mt-2 text-2xl font-black text-[#071b33]">{order.orderNumber}</h1></div><span className="rounded-full bg-sky-100 px-3 py-2 text-xs font-black text-sky-800">{order.status.replaceAll("_"," ")}</span></div>
    <div className="mt-5 rounded-2xl bg-[#071b33] p-5 text-white"><p className="text-xs font-bold uppercase tracking-wider text-sky-300">Current status</p><p className="mt-2 text-xl font-black">{stage.phase}</p><p className="mt-2 text-sm text-slate-300">Next: {stage.next}</p></div>
    {transitions.length?<Section title="Next action"><form action={setOrderStatus} className={`${card} grid gap-3 p-4`}><input type="hidden" name="id" value={order.id}/><select className={inputClass} name="status">{transitions.map(status=><option value={status} key={status}>{status.replaceAll("_"," ")}</option>)}</select><textarea className={`${inputClass} min-h-16`} name="internalNote" placeholder="Optional internal note"/><button className="min-h-12 rounded-xl bg-sky-700 px-4 font-bold text-white">Confirm next action</button></form></Section>:null}
    <Section title="Customer"><div className={`${card} p-4 text-sm leading-6`}><strong>{order.companyName??order.email}</strong><br/>{order.email}<br/>{order.phone??"No phone"}<hr className="my-3"/>{address?<>{address.recipient}<br/>{[address.line1,address.line2,address.suburb,address.city,address.province,address.postalCode].filter(Boolean).join(", ")}<OrderAddressChange orderId={order.id} address={address} supplierPlaced={order.procurements.some(item=>!["DRAFT","CANCELLED"].includes(item.status))}/></>:<span className="font-bold text-red-700">Delivery address missing</span>}</div></Section>
    <Section title="Products"><div className={card}>{order.items.map(item=><div className="border-b p-4 text-sm last:border-0" key={item.id}><strong>{item.quantity} × {item.productName}</strong><p className="text-slate-500">{item.supplierSku??item.sku} · {money(item.lineTotal)}</p></div>)}</div></Section>
    <Section title="Supplier & tracking"><OrderSupplierSetup orderId={order.id} suppliers={missingSuppliers}/><OrderSupplierShipments orderId={order.id} groups={order.procurements}/></Section>
    <Section title="Payment"><div className={`${card} p-4 text-sm`}>{order.payments.map(payment=><p key={payment.id}><strong>{payment.provider} · {payment.status}</strong> · {money(payment.amount)}</p>)}</div></Section>
    <Section title="Timeline"><div className={`${card} p-4`}>{order.deliveryEvents.map(event=><div className="mb-4 border-l-2 border-sky-500 pl-3 last:mb-0" key={event.id}><p className="text-sm font-bold">{event.status.replaceAll("_"," ")}</p><p className="text-xs text-slate-500">{event.occurredAt.toLocaleString("en-ZA")}</p>{event.publicNote?<p className="mt-1 text-sm">{event.publicNote}</p>:null}</div>)}</div></Section>
    {allowedOrderTransitions(order.status).includes("CANCELLED")?<Section title="Exception actions"><p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Cancellation and refunds remain finance-controlled exception actions. Open the full order workspace when this exception is required.</p></Section>:null}
  </>;
}
