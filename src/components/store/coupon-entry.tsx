"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CouponEntry({ code = "", saving }: { code?: string; saving?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(code);
  const apply = () => {
    const coupon = value.trim().slice(0, 40);
    router.push(coupon ? "/checkout?coupon=" + encodeURIComponent(coupon) : "/checkout");
  };
  return <section className="border-b border-slate-200 p-5 sm:p-6">
    <label className="text-sm font-bold text-slate-900" htmlFor="checkout-coupon">Coupon code</label>
    <div className="mt-2 flex gap-2">
      <input id="checkout-coupon" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm uppercase outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-700/15" maxLength={40} placeholder="Enter code" value={value} onChange={event => setValue(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); apply(); } }}/>
      <button type="button" className="rounded-lg border border-sky-700 px-4 py-2.5 text-sm font-bold text-sky-800 hover:bg-sky-50" onClick={apply}>{code ? "Update" : "Apply"}</button>
    </div>
    {saving ? <p className="mt-2 text-sm font-semibold text-emerald-700">{saving}</p> : code ? <button type="button" className="mt-2 text-xs font-semibold text-slate-600 underline" onClick={() => { setValue(""); router.push("/checkout"); }}>Remove coupon</button> : null}
  </section>;
}
