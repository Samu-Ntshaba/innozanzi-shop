"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, CreditCard, Landmark, LoaderCircle, LockKeyhole } from "lucide-react";

type Method = "PAYFAST" | "OZOW";

function SubmitButton({ method, total, available }: { method: Method; total: string; available:boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={pending||!available} className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-lg bg-sky-700 px-5 text-base font-bold text-white transition hover:bg-sky-800 disabled:bg-slate-400">{pending ? <><LoaderCircle className="size-5 animate-spin"/>Processing…</> : method === "PAYFAST" ? <>Pay {total} securely</> : <>Pay securely with Ozow</>}</button>;
}

export function PaymentMethodSelector({ total, available={OZOW:false,PAYFAST:false} }: { total: string; available?:Record<Method,boolean> }) {
  const [method, setMethod] = useState<Method>(available.PAYFAST?"PAYFAST":"OZOW");
  return <div className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Step 2</p><h2 className="text-lg font-bold text-slate-950">Pay with</h2></div><LockKeyhole className="size-5 text-emerald-700"/></div>
    <fieldset className="mt-4 space-y-3"><legend className="sr-only">Choose payment method</legend>
      <label className={`relative flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition ${method === "PAYFAST" ? "border-sky-700 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}><input className="sr-only" type="radio" name="paymentMethod" value="PAYFAST" checked={method === "PAYFAST"} onChange={() => setMethod("PAYFAST")}/><span className={`grid size-10 shrink-0 place-items-center rounded-lg ${method === "PAYFAST" ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-600"}`}><CreditCard className="size-5"/></span><span className="min-w-0 flex-1"><strong className="block text-slate-950">Pay with PayFast</strong><small className="mt-0.5 block leading-5 text-slate-500">Secure online card payment</small></span>{method === "PAYFAST" ? <span className="grid size-6 place-items-center rounded-full bg-sky-700 text-white"><Check className="size-4"/></span> : null}</label>
      <label className={`relative flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition ${method === "OZOW" ? "border-sky-700 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}><input className="sr-only" type="radio" name="paymentMethod" value="OZOW" checked={method === "OZOW"} onChange={() => setMethod("OZOW")}/><span className={`grid size-10 shrink-0 place-items-center rounded-lg ${method === "OZOW" ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-600"}`}><Landmark className="size-5"/></span><span className="min-w-0 flex-1"><strong className="block text-slate-950">Pay with Ozow</strong><small className="mt-0.5 block leading-5 text-slate-500">Secure bank payment</small></span>{method === "OZOW" ? <span className="grid size-6 place-items-center rounded-full bg-sky-700 text-white"><Check className="size-4"/></span> : null}</label>
    </fieldset>
    {method === "PAYFAST" ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">PayFast is selected. You’ll continue to its secure payment page after placing the order.</p> : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">You’ll continue to Ozow to authorise payment securely with your bank.</p>}
    {!available[method]?<p className="mt-3 text-sm text-amber-800">This payment method is being set up. Please contact support for assistance.</p>:null}<SubmitButton method={method} total={total} available={available[method]}/><p className="mt-3 text-center text-xs leading-5 text-slate-500">By placing your order, you confirm the delivery details above.</p>
  </div>;
}
