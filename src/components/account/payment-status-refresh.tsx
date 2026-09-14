"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function PaymentStatusRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const interval = window.setInterval(() => {
      if (Date.now() - started >= 90_000) {
        window.clearInterval(interval);
        setTimedOut(true);
      } else if (document.visibilityState === "visible") router.refresh();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [active, router]);
  if (!active || !timedOut) return null;
  return <p role="status" className="mt-4 rounded border border-amber-300 bg-amber-50 p-4 text-sm">Confirmation is taking longer than expected. Your order is saved. If your bank shows a debit, do not pay again. <Link className="font-bold underline" href="/account/support">Contact support with your order number</Link> so we can reconcile the payment. Automatic checks have paused. <button className="underline" onClick={()=>router.refresh()}>Check status</button></p>;
}
