"use client";

import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { useSyncExternalStore } from "react";

export const COOKIE_CONSENT_KEY = "innozanzi-cookie-consent";
export const COOKIE_CONSENT_EVENT = "innozanzi:cookie-consent";
export type CookieConsentChoice = "essential" | "analytics";

function subscribe(callback: () => void) {
  window.addEventListener(COOKIE_CONSENT_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COOKIE_CONSENT_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

const getSnapshot = () => window.localStorage.getItem(COOKIE_CONSENT_KEY);
const getServerSnapshot = () => "essential";

export function CookieConsent() {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function choose(choice: CookieConsentChoice) {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    window.dispatchEvent(new CustomEvent<CookieConsentChoice>(COOKIE_CONSENT_EVENT, { detail: choice }));
  }

  if (choice) return null;
  return <section aria-label="Cookie preferences" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-5xl rounded-xl border border-slate-700 bg-[#071b33] p-4 text-white shadow-2xl sm:inset-x-5 sm:p-5">
    <div className="flex items-start gap-3 sm:gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sky-500/15 text-sky-300"><Cookie className="size-5"/></span>
      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div><h2 className="font-bold">This site uses cookies</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">Essential cookies keep your account, security and quotation list working. With your permission, analytics cookies help us understand and improve the website.</p><Link className="mt-1 inline-block text-xs font-semibold text-sky-300 underline underline-offset-2" href="/policies/privacy">Read our privacy policy</Link></div>
        <div className="mt-4 flex shrink-0 flex-col-reverse gap-2 min-[420px]:flex-row sm:mt-0">
          <button className="min-h-10 whitespace-nowrap rounded-md border border-white/25 px-4 text-sm font-semibold hover:bg-white/10" onClick={() => choose("essential")}>Essential only</button>
          <button className="min-h-10 whitespace-nowrap rounded-md bg-sky-500 px-4 text-sm font-bold text-white hover:bg-sky-400" onClick={() => choose("analytics")}>Allow analytics</button>
        </div>
      </div>
      <button aria-label="Use essential cookies only and close" className="grid size-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white" onClick={() => choose("essential")}><X className="size-4"/></button>
    </div>
  </section>;
}
