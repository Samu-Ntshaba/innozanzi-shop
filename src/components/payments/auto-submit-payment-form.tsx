"use client";

import { useEffect, useRef } from "react";

export function AutoSubmitPaymentForm({ action, fields }: { action: string; fields: Record<string, string> }) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { form.current?.submit(); }, []);
  return <form ref={form} method="POST" action={action}>
    {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value}/>)}
    <button className="mt-6 min-h-12 w-full rounded-lg bg-sky-700 px-5 font-bold text-white hover:bg-sky-800">Continue to secure payment</button>
  </form>;
}
