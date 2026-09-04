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
  return <section aria-label="Cookie preferences" className="fixed inset-x-2 bottom-2 z-[100] mx-auto max-w-5xl rounded-lg border border-slate-700 bg-[#071b33] p-3 text-white shadow-2xl sm:inset-x-5 sm:p-5">
    <div className="flex items-start gap-2 sm:gap-4">
      <span className="hidden size-10 shrink-0 place-items-center rounded-full bg-sky-500/15 text-sky-300 sm:grid"><Cookie className="size-5"/></span>
      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div><h2 className="text-sm font-bold sm:text-base">Cookie preferences</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6"><span className="sm:hidden">Essential cookies keep the shop working. Analytics are optional.</span><span className="hidden sm:inline">Essential cookies keep your account, security and quotation list working. With your permission, analytics cookies help us understand and improve the website.</span> <Link className="font-semibold text-sky-300 underline underline-offset-2" href="/policies/privacy">Privacy</Link></p></div>
        <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
          <button className="min-h-10 flex-1 whitespace-nowrap rounded-md border border-white/25 px-3 text-xs font-semibold hover:bg-white/10 sm:flex-none sm:px-4 sm:text-sm" onClick={() => choose("essential")}>Essential only</button>
          <button className="min-h-10 flex-1 whitespace-nowrap rounded-md bg-sky-500 px-3 text-xs font-bold text-white hover:bg-sky-400 sm:flex-none sm:px-4 sm:text-sm" onClick={() => choose("analytics")}>Allow analytics</button>
        </div>
      </div>
      <button aria-label="Use essential cookies only and close" className="grid size-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white" onClick={() => choose("essential")}><X className="size-4"/></button>
    </div>
  </section>;
}
