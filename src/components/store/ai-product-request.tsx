"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export type ChatTurn = { role: "customer" | "assistant"; text: string };
export function AIProductRequest({ product, transcript }: { product: string; transcript: ChatTurn[] }) {
  const [expanded, setExpanded] = useState(false), [customer, setCustomer] = useState<{name: string | null; email: string} | null>(null), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState(""), [reference, setReference] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  useEffect(() => { if (!expanded) return; let active = true; fetch("/api/ai-shopping/request", { cache: "no-store" }).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(data => { if (active) { setCustomer(data.customer); setLoaded(true); } }).catch(() => { if (active) setStatus("Could not check your account. Close and reopen the form to retry."); }); return () => { active = false; }; }, [expanded]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/ai-shopping/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(form), requestId, consent: form.get("consent") === "on", transcript }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error);
      setReference(body.reference);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not send your request. Please try again."); } finally { setBusy(false); }
  }
  if (reference) return <div role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">Your request has been emailed to our team. Reference: <strong>{reference}</strong>. We’ll use your contact details to follow up. This does not reserve stock or place an order.<button type="button" onClick={() => { setRequestId(crypto.randomUUID()); setReference(""); setStatus(""); setExpanded(false); }} className="mt-3 block font-semibold underline">Start a new enquiry</button></div>;
  return <section className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4"><button type="button" aria-expanded={expanded} onClick={() => { if (!expanded) { setLoaded(false); setStatus(""); } setExpanded(!expanded); }} className="text-left text-sm font-bold text-sky-900">Can’t find it, out of stock, or need advice? Ask our team</button>{expanded ? <form onSubmit={submit} className="mt-4 space-y-3 text-sm">
    {!loaded ? <p>Checking your account…</p> : customer ? <p>We’ll reply to <strong>{customer.email}</strong> using your account details.</p> : <p>Leave your details so our team can reply. You don’t need an account.</p>}
    {loaded && (!customer || !customer.name) ? <label className="block">Your name<input name="name" required maxLength={100} autoComplete="name" className="mt-1 w-full rounded border bg-white p-2" /></label> : null}
    {loaded && !customer ? <label className="block">Email<input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-1 w-full rounded border bg-white p-2" /></label> : null}
    <label className="block">Phone (optional)<input name="phone" type="tel" maxLength={40} autoComplete="tel" className="mt-1 w-full rounded border bg-white p-2" /></label>
    <label className="block">Product or requirement<input name="product" defaultValue={product} required minLength={3} maxLength={500} className="mt-1 w-full rounded border bg-white p-2" /></label>
    <label className="block">How can we help?<select name="reason" className="mt-1 w-full rounded border bg-white p-2"><option value="NOT_FOUND">I couldn’t find the product</option><option value="OUT_OF_STOCK">Check stock / availability</option><option value="ADVICE">I need help choosing</option></select></label>
    <label className="block">Message<textarea name="message" maxLength={2000} rows={3} className="mt-1 w-full rounded border bg-white p-2" /></label>
    <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
    <details><summary className="cursor-pointer font-semibold">Review conversation included ({transcript.length} messages)</summary><div className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-white p-2">{transcript.length ? transcript.map((turn, index) => <p key={index} className="mb-2"><strong>{turn.role === "customer" ? "You" : "Assistant"}:</strong> {turn.text}</p>) : "No conversation yet. Only this form will be sent."}</div></details>
    <p className="text-xs leading-5">Do not include passwords, payment details, identity documents or sensitive information. Request details and the displayed conversation are emailed to Innozanzi support and retained with the support record.</p>
    <label className="flex items-start gap-2"><input type="checkbox" name="consent" required className="mt-1"/><span>I agree to share this request and displayed conversation with Innozanzi to contact me about this enquiry. <Link href="/policies/privacy" className="underline">Privacy policy</Link>. This does not subscribe me to marketing.</span></label>
    <button disabled={!loaded || busy} className="min-h-11 w-full rounded-lg bg-sky-700 px-4 font-bold text-white disabled:opacity-50">{busy ? "Sending…" : "Send product request"}</button>
  </form> : null}{status ? <p role="alert" className="mt-3 text-sm text-red-800">{status}</p> : null}</section>;
}
