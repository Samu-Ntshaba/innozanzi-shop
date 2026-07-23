"use client";

import { useState } from "react";
import { addRfqTextSource, addRfqUrlSource, uploadRfqPdf } from "@/domain/rfq/actions";
import { buttonClass, inputClass } from "./admin-ui";

type Mode = "PDF" | "WEB" | "TEXT";

export function RfqSourcePicker({ rfqId }: { rfqId: string }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const choices: [Mode, string, string][] = [
    ["PDF", "Upload PDF", "Client RFQ or tender document"],
    ["WEB", "Import link", "Public portal or web page"],
    ["TEXT", "Paste text", "Email or copied requirements"],
  ];
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-3">
        {choices.map(([value, title, detail]) => <button className={`rounded-lg border p-3 text-left transition ${mode === value ? "border-sky-600 bg-sky-50 ring-2 ring-sky-100" : "border-slate-200 bg-white hover:border-sky-300"}`} key={value} onClick={() => setMode(value)} type="button"><span className="block text-xs font-black text-sky-700">{value}</span><strong className="mt-1 block text-sm">{title}</strong><span className="mt-0.5 block text-xs text-slate-500">{detail}</span></button>)}
      </div>
      {!mode ? <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Choose one source type. Only the fields you need will open.</p> : null}
      {mode === "PDF" ? <form action={uploadRfqPdf} className="mt-3 grid gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 sm:grid-cols-2"><input name="rfqId" type="hidden" value={rfqId}/><label className="text-xs font-semibold">Document label<input className={`${inputClass} mt-1 w-full bg-white`} name="label" placeholder="Main tender document" required/></label><label className="text-xs font-semibold">Choose PDF<input className="mt-1 block min-h-10 w-full rounded-sm border border-slate-300 bg-white text-sm file:mr-3 file:border-0 file:bg-slate-800 file:px-3 file:py-2.5 file:text-xs file:font-bold file:text-white" name="file" type="file" accept="application/pdf" required/></label><div className="flex items-center justify-between sm:col-span-2"><span className="text-xs text-slate-500">PDF only · maximum 20 MB</span><button className={buttonClass}>Upload and read</button></div></form> : null}
      {mode === "WEB" ? <form action={addRfqUrlSource} className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"><input name="rfqId" type="hidden" value={rfqId}/><input className={inputClass} name="label" placeholder="Portal page" required/><input className={inputClass} name="sourceUrl" placeholder="https://…" type="url" required/><div className="text-right sm:col-span-2"><button className={buttonClass}>Import page</button></div></form> : null}
      {mode === "TEXT" ? <form action={addRfqTextSource} className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><input name="rfqId" type="hidden" value={rfqId}/><input className={inputClass} name="label" placeholder="Email requirements" required/><textarea className={`${inputClass} min-h-28`} name="text" placeholder="Paste the client requirements here…" required/><div className="text-right"><button className={buttonClass}>Save text</button></div></form> : null}
    </div>
  );
}
