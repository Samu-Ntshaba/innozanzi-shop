"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Building2, Check, Landmark, LoaderCircle, LockKeyhole } from "lucide-react";

type Method = "OZOW" | "EFT";

function SubmitButton({ method, total, available }: { method: Method; total: string; available: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={pending || !available} className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-lg bg-sky-700 px-5 text-base font-bold text-white transition hover:bg-sky-800 disabled:bg-slate-400">{pending ? <><LoaderCircle className="size-5 animate-spin"/>Processing…</> : method === "EFT" ? <>Continue with EFT</> : <>Pay {total} securely with Ozow</>}</button>;
}

function MethodOption({ method, selected, setMethod }: { method: Method; selected: boolean; setMethod: (method: Method) => void }) {
  const Icon = method === "OZOW" ? Landmark : Building2;
  const title = method === "OZOW" ? "Pay with Ozow" : "Pay by EFT";
  const detail = method === "OZOW" ? "Secure instant bank payment" : "Pay immediately, then upload proof of payment";
  const cardClass = "relative flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition " + (selected ? "border-sky-700 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300");
  const iconClass = "grid size-10 shrink-0 place-items-center rounded-lg " + (selected ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-600");
  return <label className={cardClass}><input className="sr-only" type="radio" name="paymentMethod" value={method} checked={selected} onChange={() => setMethod(method)}/><span className={iconClass}><Icon className="size-5"/></span><span className="min-w-0 flex-1"><strong className="block text-slate-950">{title}</strong><small className="mt-0.5 block leading-5 text-slate-500">{detail}</small></span>{selected ? <span className="grid size-6 place-items-center rounded-full bg-sky-700 text-white"><Check className="size-4"/></span> : null}</label>;
}

export function PaymentMethodSelector({ total, available = { OZOW: false, EFT: false } }: { total: string; available?: Record<Method, boolean> }) {
  const [method, setMethod] = useState<Method>(available.OZOW ? "OZOW" : "EFT");
  const noMethods = !available.OZOW && !available.EFT;
  return <div className="p-5 sm:p-6">
    <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Step 2</p><h2 className="text-lg font-bold text-slate-950">Pay with</h2></div><LockKeyhole className="size-5 text-emerald-700"/></div>
    <fieldset className="mt-4 space-y-3"><legend className="sr-only">Choose payment method</legend>
      {available.OZOW ? <MethodOption method="OZOW" selected={method === "OZOW"} setMethod={setMethod}/> : null}
      {available.EFT ? <MethodOption method="EFT" selected={method === "EFT"} setMethod={setMethod}/> : null}
    </fieldset>
    {noMethods ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Online payment is temporarily unavailable. Please contact support.</p> : method === "EFT" ? <p className="mt-4 rounded-lg bg-sky-50 p-3 text-xs leading-5 text-sky-900"><strong>Make your EFT payment immediately after placing the order.</strong> We will only process and fulfil your order once the payment has reflected in our bank account and has been verified.</p> : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">You’ll continue to Ozow to authorise payment securely with your bank.</p>}
    <SubmitButton method={method} total={total} available={!noMethods && available[method]}/>
    <p className="mt-3 text-center text-xs leading-5 text-slate-500">By placing your order, you confirm the delivery details and agree to our <Link className="underline" href="/policies/terms">Terms &amp; Conditions</Link> and <Link className="underline" href="/policies/delivery">Delivery Policy</Link>.</p>
  </div>;
}
