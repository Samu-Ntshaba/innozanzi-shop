"use client";

import { useMemo,useState } from "react";
import { inputClass } from "./admin-ui";

type Kind="quotation"|"invoice"|"delivery";
type Row={id:number;description:string;quantity:string;unitPrice:string;vat:string};

export function DynamicLineItems({kind,maxRows=12}:{kind:Kind;maxRows?:number}){
  const [nextId,setNextId]=useState(1);
  const [rows,setRows]=useState<Row[]>([{id:0,description:"",quantity:"1",unitPrice:"",vat:kind==="invoice"?"0":""}]);
  const priced=kind!=="delivery";
  const total=useMemo(()=>rows.reduce((sum,row)=>sum+(Number(row.quantity)||0)*(Number(row.unitPrice)||0),0),[rows]);
  function change(id:number,field:keyof Omit<Row,"id">,value:string){setRows(current=>current.map(row=>row.id===id?{...row,[field]:value}:row))}
  function add(){if(rows.length>=maxRows)return;setRows(current=>[...current,{id:nextId,description:"",quantity:"1",unitPrice:"",vat:kind==="invoice"?"0":""}]);setNextId(value=>value+1)}
  function remove(id:number){setRows(current=>current.length===1?[{...current[0],description:"",quantity:"1",unitPrice:"",vat:kind==="invoice"?"0":""}]:current.filter(row=>row.id!==id))}
  return <div className="space-y-3">
    <div className={`hidden gap-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:grid ${priced?"grid-cols-[minmax(0,1fr)_90px_140px_110px_42px]":"grid-cols-[minmax(0,1fr)_110px_42px]"}`}>
      <span>Description</span><span>Quantity</span>{priced?<span>Unit price</span>:null}{kind==="invoice"?<span>VAT %</span>:kind==="quotation"?<span>Tax</span>:null}<span/>
    </div>
    {rows.map((row,index)=><div className={`grid gap-3 border border-slate-300 bg-slate-50/60 p-3 ${priced?"sm:grid-cols-[minmax(0,1fr)_90px_140px_110px_42px]":"sm:grid-cols-[minmax(0,1fr)_110px_42px]"} sm:items-center`} key={row.id}>
      <label className="text-xs font-semibold text-slate-600 sm:contents"><span className="sm:hidden">Description</span><input className={`${inputClass} mt-1 w-full sm:mt-0`} name={kind==="quotation"?`item_${index}_name`:`description_${index}`} value={row.description} onChange={event=>change(row.id,"description",event.target.value)} placeholder="Product or service description" required={index===0}/></label>
      <label className="text-xs font-semibold text-slate-600 sm:contents"><span className="sm:hidden">Quantity</span><input className={`${inputClass} mt-1 w-full sm:mt-0`} name={kind==="quotation"?`item_${index}_quantity`:`quantity_${index}`} value={row.quantity} onChange={event=>change(row.id,"quantity",event.target.value)} type="number" min="1" placeholder="Qty" required/></label>
      {priced?<label className="text-xs font-semibold text-slate-600 sm:contents"><span className="sm:hidden">Unit price</span><input className={`${inputClass} mt-1 w-full sm:mt-0`} name={kind==="quotation"?`item_${index}_price`:`unitPrice_${index}`} value={row.unitPrice} onChange={event=>change(row.id,"unitPrice",event.target.value)} type="number" min={kind==="quotation"?".01":"0"} step=".01" placeholder="R 0.00" required/></label>:null}
      {kind==="invoice"?<label className="text-xs font-semibold text-slate-600 sm:contents"><span className="sm:hidden">VAT percentage</span><input className={`${inputClass} mt-1 w-full sm:mt-0`} name={`vatRate_${index}`} value={row.vat} onChange={event=>change(row.id,"vat",event.target.value)} type="number" min="0" max="100" step=".01" placeholder="0"/></label>:null}
      {kind==="quotation"?<label className="flex min-h-10 items-center gap-2 text-sm"><input name={`item_${index}_taxable`} type="checkbox"/><span>Add VAT</span></label>:null}
      <button aria-label={`Remove line ${index+1}`} className="inline-flex min-h-10 items-center justify-center border border-rose-200 bg-white px-3 font-bold text-rose-700 hover:bg-rose-50 sm:px-0" onClick={()=>remove(row.id)} type="button"><span className="sm:hidden">Remove item</span><span className="hidden sm:inline">×</span></button>
    </div>)}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
      <button className="inline-flex min-h-10 items-center border border-sky-300 bg-sky-50 px-4 text-sm font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-40" disabled={rows.length>=maxRows} onClick={add} type="button">+ Add another item</button>
      <div className="text-right"><p className="text-xs text-slate-500">{rows.length} of {maxRows} lines</p>{priced?<p className="font-semibold tabular-nums text-slate-900">Entered total: R {total.toLocaleString("en-ZA",{minimumFractionDigits:2,maximumFractionDigits:2})}</p>:null}</div>
    </div>
  </div>;
}
