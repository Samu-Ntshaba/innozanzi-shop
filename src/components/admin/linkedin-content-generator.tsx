"use client";

import { useActionState, useState } from "react";
import { generateLinkedinContent, initialLinkedinContentState } from "@/domain/marketing/linkedin-content";
import { buttonClass, inputClass } from "@/components/admin/admin-ui";

type ProductOption = { id: string; name: string; brand: string | null; manufacturerSku: string | null };

export function LinkedinContentGenerator({ products }: { products: ProductOption[] }) {
  const [state, action, pending] = useActionState(generateLinkedinContent, initialLinkedinContentState);
  const [mode, setMode] = useState("SELECTED_PRODUCT");
  const [copied, setCopied] = useState(false);

  async function copyPost() {
    if (!state.content) return;
    await navigator.clipboard.writeText(state.content.fullPost);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
    <form action={action} className="space-y-4 border border-slate-300 bg-white p-5 shadow-sm">
      <label className="block text-sm font-medium">Content source<select className={`${inputClass} mt-1 w-full`} name="mode" value={mode} onChange={(event) => setMode(event.target.value)}>
        <option value="SELECTED_PRODUCT">Choose a product</option>
        <option value="RANDOM_PRODUCT">Choose an eligible product for me</option>
        <option value="BUSINESS_INSIGHT">General B2B business insight</option>
      </select></label>
      {mode === "SELECTED_PRODUCT" ? <label className="block text-sm font-medium">Product<select className={`${inputClass} mt-1 w-full`} name="productId" required>
        <option value="">Select a catalogue product</option>
        {products.map((product) => <option value={product.id} key={product.id}>{product.brand ? `${product.brand} · ` : ""}{product.name}{product.manufacturerSku ? ` · ${product.manufacturerSku}` : ""}</option>)}
      </select></label> : <input name="productId" type="hidden" value=""/>}
      <label className="block text-sm font-medium">Audience<select className={`${inputClass} mt-1 w-full`} name="audience" defaultValue="GENERAL_B2B">
        <option value="GENERAL_B2B">General B2B decision-makers</option><option value="SME">SMEs</option><option value="CORPORATE">Corporate procurement and IT</option><option value="EDUCATION">Education</option><option value="PUBLIC_SECTOR">Public sector</option><option value="NONPROFIT">Nonprofits</option>
      </select></label>
      <label className="block text-sm font-medium">Objective<select className={`${inputClass} mt-1 w-full`} name="objective" defaultValue="PROBLEM_SOLUTION">
        <option value="PROBLEM_SOLUTION">Solve a client problem</option><option value="LEAD_GENERATION">Generate enquiries</option><option value="PRODUCT_AWARENESS">Introduce a product</option><option value="TRUST">Build trust</option><option value="ENGAGEMENT">Start a useful discussion</option>
      </select></label>
      <label className="block text-sm font-medium">Optional direction<textarea className={`${inputClass} mt-1 min-h-28 w-full`} name="direction" placeholder="Example: Focus on reducing downtime for growing teams without making unsupported savings claims."/></label>
      <p className="text-xs leading-5 text-slate-500">OpenAI receives public catalogue facts only. Review every draft before posting; this tool never publishes automatically.</p>
      <button className={`${buttonClass} w-full`} disabled={pending}>{pending ? "Generating…" : "Generate LinkedIn draft"}</button>
      {state.status === "error" ? <p className="border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{state.message}</p> : null}
    </form>
    <section className="border border-slate-300 bg-white p-5 shadow-sm" aria-live="polite">
      {!state.content ? <div className="grid min-h-80 place-items-center text-center text-sm text-slate-500"><div><p className="font-semibold text-slate-700">Your reviewed draft will appear here</p><p className="mt-1">Choose a source, audience and objective to begin.</p></div></div> : <div className="space-y-5">
        <div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">{state.content.productName ? `Product · ${state.content.productName}` : "Business insight"}</p><h2 className="mt-1 text-xl font-bold text-slate-950">{state.content.headline}</h2></div>
        <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-800">{state.content.fullPost}</div>
        <button className={buttonClass} type="button" onClick={copyPost}>{copied ? "Copied" : "Copy complete post"}</button>
        <dl className="grid gap-4 border-t pt-4 text-sm sm:grid-cols-2"><div><dt className="font-bold">Suggested visual</dt><dd className="mt-1 text-slate-600">{state.content.imageBrief}</dd></div><div><dt className="font-bold">Why this angle</dt><dd className="mt-1 text-slate-600">{state.content.rationale}</dd></div></dl>
      </div>}
    </section>
  </div>;
}
