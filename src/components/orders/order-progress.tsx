import { orderStageContext } from "@/domain/orders/lifecycle";

const milestones = [
  { label: "Payment confirmed", statuses: ["PAYMENT_VERIFIED"] },
  { label: "Order processing", statuses: ["PROCESSING"] },
  { label: "Products prepared", statuses: ["SOURCING_ITEMS", "ITEMS_RECEIVED", "PACKING"] },
  { label: "Delivery", statuses: ["READY_FOR_DELIVERY", "DISPATCHED", "IN_TRANSIT"] },
  { label: "Completed", statuses: ["DELIVERED", "COMPLETED"] },
] as const;

export function OrderProgress({status,compact=false}:{status:string;compact?:boolean}) {
  const current=Math.max(0,milestones.findIndex(({statuses})=>(statuses as readonly string[]).includes(status)));
  if(status==="CANCELLED")return <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">Order cancelled</div>;
  return <div><div className="flex items-center">{milestones.map((stage,index)=><div className="flex flex-1 items-center last:flex-none" key={stage.label}><span aria-label={stage.label} className={`size-3 shrink-0 rounded-full ring-4 ${index<=current?"bg-sky-600 ring-sky-100":"bg-slate-300 ring-slate-100"}`}/>{index<milestones.length-1?<span className={`h-1 w-full ${index<current?"bg-sky-500":"bg-slate-200"}`}/>:null}</div>)}</div>{!compact?<div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase text-slate-500 sm:grid-cols-5">{milestones.map((stage,index)=><span className={index===current?"text-sky-700":""} key={stage.label}>{stage.label}</span>)}</div>:<p className="mt-2 text-xs font-semibold text-slate-600">{orderStageContext(status).customer}</p>}</div>;
}
