"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass, inputClass } from "@/components/admin/admin-ui";
import { createManualPartner } from "@/domain/partnerships/admin-actions";

type Option={id:string;label:string};

function CreateButton(){
  const{pending}=useFormStatus();
  return <button className={`${buttonClass} w-full disabled:cursor-wait disabled:opacity-70 sm:w-auto`} disabled={pending}>{pending?"Creating partner and sending invitation…":"Create partner and notify client"}</button>;
}

export function ManualPartnerForm({clients,types,managers}:{clients:Option[];types:Option[];managers:Option[]}){
  const[mode,setMode]=useState<"NEW"|"EXISTING">("NEW");
  return <form action={createManualPartner} className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={()=>setMode("NEW")} className={`rounded-xl border p-4 text-left transition ${mode==="NEW"?"border-blue-600 bg-blue-50 ring-2 ring-blue-100":"border-slate-200 hover:border-slate-300"}`}>
        <span className="block font-semibold">Add a new partner</span><span className="mt-1 block text-sm text-slate-600">Enter their details here. We create and invite the customer automatically.</span>
      </button>
      <button type="button" onClick={()=>setMode("EXISTING")} className={`rounded-xl border p-4 text-left transition ${mode==="EXISTING"?"border-blue-600 bg-blue-50 ring-2 ring-blue-100":"border-slate-200 hover:border-slate-300"}`}>
        <span className="block font-semibold">Use an existing client</span><span className="mt-1 block text-sm text-slate-600">Select someone who already has an active customer account.</span>
      </button>
    </div>
    <input type="hidden" name="sourceMode" value={mode}/>
    {mode==="NEW"?<div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
      <label className="font-semibold">Contact name<input className={`${inputClass} mt-1 w-full`} name="name" autoComplete="name" required/></label>
      <label className="font-semibold">Email address<input className={`${inputClass} mt-1 w-full`} name="email" type="email" autoComplete="email" required/></label>
      <label className="font-semibold">Phone number<input className={`${inputClass} mt-1 w-full`} name="phone" type="tel" autoComplete="tel"/></label>
      <label className="font-semibold">Business or trading name<input className={`${inputClass} mt-1 w-full`} name="companyName" required/></label>
      <label className="font-semibold sm:col-span-2">Company registration number <span className="font-normal text-slate-500">(optional)</span><input className={`${inputClass} mt-1 w-full`} name="registrationNo"/></label>
    </div>:<div>
      <label className="font-semibold">Registered client<select className={`${inputClass} mt-1 w-full`} name="userId" required><option value="">Select client</option>{clients.map(client=><option key={client.id} value={client.id}>{client.label}</option>)}</select></label>
      {!clients.length&&<p className="mt-2 text-sm text-amber-700">There are no existing eligible clients. Choose “Add a new partner” instead.</p>}
    </div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="font-semibold">Partnership track<select className={`${inputClass} mt-1 w-full`} name="partnershipTypeId" required><option value="">Select track</option>{types.map(type=><option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
      <label className="font-semibold">Account manager<select className={`${inputClass} mt-1 w-full`} name="accountManagerId"><option value="">Unassigned</option>{managers.map(manager=><option key={manager.id} value={manager.id}>{manager.label}</option>)}</select></label>
      <label className="font-semibold">Approval status<select className={`${inputClass} mt-1 w-full`} name="status"><option value="APPROVED">Approved</option><option value="CONDITIONALLY_APPROVED">Conditionally approved</option></select></label>
      <label className="font-semibold sm:col-span-2">Decision and onboarding note<textarea className={`${inputClass} mt-1 min-h-28 w-full`} name="reason" placeholder="Why the partnership is being approved and any conditions the partner must meet." required/></label>
    </div>
    <CreateButton/>
  </form>;
}
