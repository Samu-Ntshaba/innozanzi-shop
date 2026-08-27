"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, CreditCard, Landmark, LoaderCircle, LockKeyhole } from "lucide-react";

type Method = "PAYSTACK" | "EFT";

function SubmitButton({ method, total }: { method: Method; total: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-lg bg-sky-700 px-5 text-base font-bold text-white transition hover:bg-sky-800 disabled:bg-slate-400">{pending ? <><LoaderCircle className="size-5 animate-spin"/>Processing…</> : method === "PAYSTACK" ? <>Pay {total} securely</> : <>Place order and pay by EFT</>}</button>;
}

export function PaymentMethodSelector({ total }: { total: string }) {
  const [method, setMethod] = useState<Method>("PAYSTACK");
  return <div className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Step 2</p><h2 className="text-lg font-bold text-slate-950">Pay with</h2></div><LockKeyhole className="size-5 text-emerald-700"/></div>
    <fieldset className="mt-4 space-y-3"><legend className="sr-only">Choose payment method</legend>
      <label className={`relative flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition ${method === "PAYSTACK" ? "border-sky-700 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}><input className="sr-only" type="radio" name="paymentMethod" value="PAYSTACK" checked={method === "PAYSTACK"} onChange={() => setMethod("PAYSTACK")}/><span className={`grid size-10 shrink-0 place-items-center rounded-lg ${method === "PAYSTACK" ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-600"}`}><CreditCard className="size-5"/></span><span className="min-w-0 flex-1"><strong className="block text-slate-950">Pay with Paystack</strong><small className="mt-0.5 block leading-5 text-slate-500">Secure online card payment</small></span>{method === "PAYSTACK" ? <span className="grid size-6 place-items-center rounded-full bg-sky-700 text-white"><Check className="size-4"/></span> : null}</label>
      <label className={`relative flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition ${method === "EFT" ? "border-sky-700 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}><input className="sr-only" type="radio" name="paymentMethod" value="EFT" checked={method === "EFT"} onChange={() => setMethod("EFT")}/><span className={`grid size-10 shrink-0 place-items-center rounded-lg ${method === "EFT" ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-600"}`}><Landmark className="size-5"/></span><span className="min-w-0 flex-1"><strong className="block text-slate-950">Bank transfer (EFT)</strong><small className="mt-0.5 block leading-5 text-slate-500">Place the order, then upload proof of payment</small></span>{method === "EFT" ? <span className="grid size-6 place-items-center rounded-full bg-sky-700 text-white"><Check className="size-4"/></span> : null}</label>
    </fieldset>
    {method === "PAYSTACK" ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">Paystack is selected. You’ll continue to its secure payment page after placing the order.</p> : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Your order number and verified Standard Bank details will appear on the next page.</p>}
    <SubmitButton method={method} total={total}/><p className="mt-3 text-center text-xs leading-5 text-slate-500">By placing your order, you confirm the delivery details above.</p>
  </div>;
}
