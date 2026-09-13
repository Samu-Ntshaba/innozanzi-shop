"use client";

import { Check, Copy, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";

const control = "inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:border-sky-500 hover:bg-sky-50 hover:text-sky-800";

export function ProductShare({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? `https://shop.innozanzi.co.za${path}` : new URL(path, window.location.origin).toString();
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(`${title} from Innozanzi`);
  async function nativeShare() {
    if (navigator.share) await navigator.share({ title, text: title, url });
    else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_500);
    }
  }
  return <section aria-label="Share this product" className="mt-6 border-t pt-5">
    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Share product</p>
    <div className="mt-2 flex flex-wrap gap-2 text-sm">
      <a className={control} href={`https://wa.me/?text=${text}%20${encoded}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4 text-emerald-600" aria-hidden="true"/>WhatsApp</a>
      <a className={control} href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`} target="_blank" rel="noreferrer"><FacebookIcon/>Facebook</a>
      <a className={control} href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`} target="_blank" rel="noreferrer"><LinkedInIcon/>LinkedIn</a>
      <a className={control} href={`https://twitter.com/intent/tweet?text=${text}&url=${encoded}`} target="_blank" rel="noreferrer"><XIcon/>X</a>
      <a className={control} href={`mailto:?subject=${text}&body=${encoded}`}><Mail className="size-4 text-sky-700" aria-hidden="true"/>Email</a>
      <button className={control} onClick={nativeShare} type="button">{copied ? <Check className="size-4 text-emerald-600" aria-hidden="true"/> : <Copy className="size-4 text-sky-700" aria-hidden="true"/>}{copied ? "Link copied" : "Share / copy"}</button>
    </div>
  </section>;
}

function FacebookIcon() { return <svg className="size-4 text-[#1877f2]" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M14 8.5V7c0-.9.6-1 1.1-1H18V2.1A38 38 0 0 0 14.6 2C11.2 2 9 4.1 9 7.9v.6H6V13h3v9h5v-9h3.5l.5-4.5H14Z"/></svg>; }
function LinkedInIcon() { return <svg className="size-4 text-[#0a66c2]" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M5.2 7.8H1.6V22h3.6V7.8ZM3.4 2A2.1 2.1 0 1 0 3.4 6.2 2.1 2.1 0 0 0 3.4 2ZM22.4 13.8c0-4.3-2.3-6.3-5.4-6.3a5.3 5.3 0 0 0-4.8 2.6V7.8H8.6V22h3.6v-7c0-1.8.3-3.6 2.6-3.6 2.3 0 2.3 2.1 2.3 3.7V22h3.7v-7.8c0-3.8-.8-6.7-5.2-6.7Z"/></svg>; }
function XIcon() { return <svg className="size-3.5 text-slate-950" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23.2 22H17l-4.9-6.4L6.5 22H3.4l7.2-8.3L2.9 2h6.3l4.4 5.8L18.9 2Zm-1.1 17.9h1.7L8.3 4H6.5l11.3 15.9Z"/></svg>; }
