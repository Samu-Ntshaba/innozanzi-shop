const stages = ["PAYMENT_VERIFIED","PROCESSING","SOURCING_ITEMS","ITEMS_RECEIVED","PACKING","READY_FOR_DELIVERY","DISPATCHED","IN_TRANSIT","DELIVERED","COMPLETED"] as const;

export function OrderProgress({status,compact=false}:{status:string;compact?:boolean}) {
  const current=stages.indexOf(status as typeof stages[number]);
  if(status==="CANCELLED")return <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">Order cancelled</div>;
  return <div><div className="flex items-center">{stages.map((stage,index)=><div className="flex flex-1 items-center last:flex-none" key={stage}><span aria-label={stage.replaceAll("_"," ")} className={`size-3 shrink-0 rounded-full ring-4 ${index<=current?"bg-sky-600 ring-sky-100":"bg-slate-300 ring-slate-100"}`}/>{index<stages.length-1?<span className={`h-1 w-full ${index<current?"bg-sky-500":"bg-slate-200"}`}/>:null}</div>)}</div>{!compact?<div className="mt-3 grid grid-cols-2 gap-1 text-[10px] font-bold uppercase text-slate-500 sm:grid-cols-5">{stages.map((stage,index)=><span className={index===current?"text-sky-700":""} key={stage}>{stage.replaceAll("_"," ")}</span>)}</div>:<p className="mt-2 text-xs font-semibold text-slate-600">{status.replaceAll("_"," ")}</p>}</div>;
}
