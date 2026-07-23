"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const phases=[["clear","Preparing isolated database"],["catalogue","Loading products and images"],["customer","Creating customer accounts"],["commercial","Building quotations, invoices and orders"],["operations","Creating delivery, tickets, tasks and RFQs"]] as const;

export function TestModeControl({enabled}:{enabled:boolean}){
  const router=useRouter();
  const [progress,setProgress]=useState(0);
  const [message,setMessage]=useState(enabled?"Ready to generate deterministic test data.":"Test Mode deployment is not active.");
  const [running,setRunning]=useState(false);
  const [error,setError]=useState("");
  async function call(operation:string){
    const response=await fetch("/api/admin/test-mode",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({operation})});
    const body=await response.json() as {error?:string};
    if(!response.ok)throw new Error(body.error??"Operation failed.");
  }
  async function generate(){
    setRunning(true);setError("");setProgress(0);
    try{
      for(let index=0;index<phases.length;index++){setMessage(phases[index][1]);await call(phases[index][0]);setProgress((index+1)*20);}
      setMessage("Test workspace is ready.");router.refresh();
    }catch(reason){setError(reason instanceof Error?reason.message:"Generation failed.");}
    finally{setRunning(false);}
  }
  async function clear(){
    if(!window.confirm("Clear every business record in the isolated Test Mode database? This cannot be undone."))return;
    setRunning(true);setError("");setMessage("Removing all isolated test data…");setProgress(10);
    try{await call("clear");setProgress(100);setMessage("Test data cleared. Staff access and system configuration were preserved.");router.refresh();}
    catch(reason){setError(reason instanceof Error?reason.message:"Cleanup failed.");}
    finally{setRunning(false);}
  }
  return <div className="space-y-4">
    <div className="h-4 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-sky-600 transition-[width] duration-500" style={{width:`${progress}%`}}/></div>
    <div className="flex items-center justify-between gap-3 text-sm"><span>{message}</span><strong>{progress}%</strong></div>
    {error?<p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>:null}
    <div className="flex flex-wrap gap-3"><button className="min-h-11 rounded-lg bg-sky-700 px-5 font-bold text-white disabled:opacity-40" disabled={!enabled||running} onClick={generate}>{running?"Working…":"Generate complete test dataset"}</button><button className="min-h-11 rounded-lg border border-rose-300 bg-rose-50 px-5 font-bold text-rose-800 disabled:opacity-40" disabled={!enabled||running} onClick={clear}>Clear test data</button></div>
  </div>;
}
