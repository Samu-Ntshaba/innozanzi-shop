import { Check, Clock3, PackageCheck, Truck } from "lucide-react";
import Image from "next/image";
import { orderStageContext } from "@/domain/orders/lifecycle";

export type OrderProgressDetails = {
  status: string;
  placedAt?: Date | null;
  estimatedDeliveryAt?: Date | null;
  deliveredAt?: Date | null;
  returnWindowEndsAt?: Date | null;
  supplierOrderedAt?: Date | null;
  supplierConfirmedAt?: Date | null;
  events?: Array<{ status: string; occurredAt: Date }>;
};

const statusRank: Record<string, number> = { PENDING: 0, AWAITING_PAYMENT: 0, PAYMENT_UNDER_REVIEW: 0, PAID: 1, PAYMENT_VERIFIED: 1, PROCESSING: 2, SOURCING_ITEMS: 3, ITEMS_RECEIVED: 4, PACKING: 4, READY_FOR_DELIVERY: 5, DISPATCHED: 6, IN_TRANSIT: 6, SHIPPED: 6, DELIVERED: 7, COMPLETED: 8 };
const eventDate = (events: OrderProgressDetails["events"], statuses: string[]) => events?.find(event => statuses.includes(event.status))?.occurredAt ?? null;

export function OrderProgress({ status, compact = false, details }: { status: string; compact?: boolean; details?: Omit<OrderProgressDetails, "status"> }) {
  if (status === "CANCELLED" || status === "REFUNDED") return <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">This order was {status.toLowerCase()}.</div>;
  const supplierOrdered = Boolean(details?.supplierOrderedAt);
  const supplierConfirmed = Boolean(details?.supplierConfirmedAt);
  const rank = statusRank[status] ?? 0;
  const stages = [
    { label: "Payment confirmed", done: rank >= 1, current: rank === 1, date: eventDate(details?.events, ["PAYMENT_VERIFIED", "PAID"]) ?? details?.placedAt },
    { label: "Processing", done: rank >= 2, current: rank === 2, date: eventDate(details?.events, ["PROCESSING"]) },
    { label: "Supplier order placed", done: supplierOrdered || rank >= 4, current: rank === 3 && !supplierConfirmed, date: details?.supplierOrderedAt },
    { label: "Supplier confirmed", done: supplierConfirmed || rank >= 4, current: rank === 3 && supplierOrdered && !supplierConfirmed, date: details?.supplierConfirmedAt },
    { label: "Delivery scheduled", done: Boolean(details?.estimatedDeliveryAt) || rank >= 6, current: rank === 5, date: details?.estimatedDeliveryAt },
    { label: "Out for delivery", done: rank >= 6, current: rank === 6, date: eventDate(details?.events, ["DISPATCHED", "IN_TRANSIT", "SHIPPED"]) },
    { label: "Delivered", done: rank >= 7, current: false, date: details?.deliveredAt ?? eventDate(details?.events, ["DELIVERED"]) },
    { label: "Return window", done: rank >= 8, current: rank === 7, date: details?.returnWindowEndsAt, datePrefix: "Ends" },
    { label: "Completed", done: rank >= 8, current: rank === 8, date: eventDate(details?.events, ["COMPLETED"]) },
  ];
  if (compact) return <div><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-sky-600 transition-all" style={{ width: `${Math.max(8, ((stages.filter(stage => stage.done).length - 1) / (stages.length - 1)) * 100)}%` }}/></div><p className="mt-2 text-xs font-semibold text-slate-600">{orderStageContext(status).customer}</p></div>;
  const current = Math.max(0, stages.findIndex(stage => stage.current));
  const progress = Math.max(0, Math.min(100, (current / (stages.length - 1)) * 100));
  return <div aria-label={`Order progress: ${stages[current]?.label ?? orderStageContext(status).customer}`}>
    <div className="relative hidden pb-4 pt-16 lg:block"><div className="absolute left-5 right-5 top-[5.15rem] h-1 rounded-full bg-slate-200"/><div className="absolute left-5 top-[5.15rem] h-1 rounded-full bg-sky-500 transition-all" style={{ width: `calc((100% - 2.5rem) * ${progress / 100})` }}/><div className="absolute top-2 z-10 -translate-x-1/2 transition-[left]" style={{ left: `calc(1.25rem + (100% - 2.5rem) * ${progress / 100})` }}><div className="relative flex h-12 w-20 items-center justify-center rounded-xl bg-[#071b33] text-white shadow-lg"><Truck className="size-7"/><Image src="/brand/innozanzi-shop-mark.png" alt="" width={20} height={20} className="ml-1 rounded bg-white p-0.5"/><span className="absolute -bottom-1 left-3 size-3 rounded-full border-2 border-white bg-slate-800"/><span className="absolute -bottom-1 right-3 size-3 rounded-full border-2 border-white bg-slate-800"/></div></div><div className="relative grid grid-cols-9">{stages.map((stage, index) => <div className="min-w-0 text-center" key={stage.label}><span className={`mx-auto grid size-7 place-items-center rounded-full border-4 ${stage.done ? "border-sky-100 bg-sky-600 text-white" : stage.current ? "border-amber-100 bg-amber-500 text-white" : "border-slate-100 bg-slate-300 text-slate-500"}`}>{stage.done ? <Check className="size-3"/> : <span className="size-1.5 rounded-full bg-current"/>}</span><p className={`mt-3 text-[11px] font-bold leading-4 ${stage.current ? "text-sky-800" : "text-slate-600"}`}>{stage.label}</p>{stage.date ? <p className="mt-1 text-[10px] text-slate-500">{stage.datePrefix ? `${stage.datePrefix} ` : ""}{stage.date.toLocaleDateString("en-ZA")}</p> : null}</div>)}</div></div>
    <ol className="space-y-0 lg:hidden">{stages.map((stage, index) => <li className="relative flex gap-4 pb-5 last:pb-0" key={stage.label}>{index < stages.length - 1 ? <span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${stage.done ? "bg-sky-500" : "bg-slate-200"}`}/> : null}<span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full ${stage.done ? "bg-sky-600 text-white" : stage.current ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500"}`}>{stage.done ? <Check className="size-4"/> : stage.current ? <Truck className="size-4"/> : <Clock3 className="size-4"/>}</span><div className={`min-w-0 flex-1 rounded-lg px-3 py-2 ${stage.current ? "bg-sky-50 ring-1 ring-sky-200" : ""}`}><p className={`text-sm font-bold ${stage.current ? "text-sky-900" : stage.done ? "text-slate-800" : "text-slate-500"}`}>{stage.label}</p>{stage.date ? <p className="mt-0.5 text-xs text-slate-500">{stage.datePrefix ? `${stage.datePrefix} ` : ""}{stage.date.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</p> : null}</div></li>)}</ol>
    <p className="mt-5 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600"><PackageCheck className="mt-0.5 size-4 shrink-0 text-sky-700"/>The vehicle shows workflow progress only. It is not live GPS tracking.</p>
  </div>;
}
