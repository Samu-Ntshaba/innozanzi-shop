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
        setTimedOut(true);
      }
      if (document.visibilityState === "visible" && (Date.now()-started<90_000 || Math.floor((Date.now()-started)/3000)%10===0)) router.refresh();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [active, router]);
  if (!active || !timedOut) return null;
  return <p role="status" className="mt-4 rounded border border-amber-300 bg-amber-50 p-4 text-sm">Payment confirmation is taking longer than usual. Please do not pay again. Server checks continue even if you close this page. Unresolved payments are flagged for our team. <Link className="font-bold underline" href="/account/support">Contact support</Link> if you need help. <button className="underline" onClick={()=>router.refresh()}>Check status</button></p>;
}
