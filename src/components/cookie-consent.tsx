"use client";

import Link from "next/link";
import { Cookie } from "lucide-react";
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

const getSnapshot = () => {
  const value = document.cookie.match(/(?:^|; )innozanzi-consent=(analytics|essential)(?:;|$)/)?.[1];
  return value ?? null;
};
const getServerSnapshot = () => "essential";

  function chooseAdvertising(allowed: boolean) {
    document.cookie = `innozanzi-ad-consent=${allowed ? "granted" : "denied"}; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    try { localStorage.setItem("innozanzi-ad-consent", allowed ? "granted" : "denied"); } catch { /* Cookie is authoritative. */ }
    if (!allowed) clearCookies(/^(_gcl|_gac)/);
    window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
  }
  function clearCookies(pattern: RegExp) {
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.trim().split("=")[0];
      if (!pattern.test(name)) continue;
      document.cookie = `${name}=; Path=/; Max-Age=0`;
      const parts = location.hostname.split(".");
      for (let i = 0; i < parts.length - 1; i++) document.cookie = `${name}=; Path=/; Max-Age=0; Domain=.${parts.slice(i).join(".")}`;
    }
  }


export function CookieConsent() {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const advertising = useSyncExternalStore(subscribe, () => /(?:^|; )innozanzi-ad-consent=granted(?:;|$)/.test(document.cookie), () => false);

  function choose(choice: CookieConsentChoice) {
    try { window.localStorage.setItem(COOKIE_CONSENT_KEY, choice); } catch { /* Cookies remain the source of truth. */ }
    document.cookie = `innozanzi-consent=${choice}; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    if (choice === "essential") {
      window.gtag?.("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      chooseAdvertising(false);
      clearCookies(/^(_ga|_gid|_gat)/);
      void fetch("/api/recommendations/events", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    }
    window.dispatchEvent(new CustomEvent<CookieConsentChoice>(COOKIE_CONSENT_EVENT, { detail: choice }));
  }

  return <section aria-label="Cookie preferences" className="mt-6 rounded-lg border border-slate-700 bg-[#071b33] p-3 text-white  sm:p-5">
    <div className="flex items-start gap-2 sm:gap-4">
      <span className="hidden size-10 shrink-0 place-items-center rounded-full bg-sky-500/15 text-sky-300 sm:grid"><Cookie className="size-5"/></span>
      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div><h2 className="text-sm font-bold sm:text-base">Cookie preferences</h2><p className="mt-1 text-xs text-slate-300" role="status">Current choice: {choice === "analytics" ? "Analytics allowed" : "Analytics off"}{advertising ? " · Ads measurement allowed" : " · Ads measurement off"}</p><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6"><span className="sm:hidden">Essential cookies keep the shop working. Analytics are optional.</span><span className="hidden sm:inline">Essential cookies keep your account, security and quotation list working. With your permission, analytics cookies help us understand and improve the website.</span> <Link className="font-semibold text-sky-300 underline underline-offset-2" href="/policies/privacy">Privacy</Link> · <Link className="underline" href="/policies/cookies">Cookies</Link></p></div>
        <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
          <button className="min-h-10 flex-1 whitespace-nowrap rounded-md border border-white/25 px-3 text-xs font-semibold hover:bg-white/10 sm:flex-none sm:px-4 sm:text-sm" aria-pressed={choice !== "analytics" && !advertising} onClick={() => choose("essential")}>Essential only</button>
          <button className="min-h-10 flex-1 whitespace-nowrap rounded-md bg-sky-500 px-3 text-xs font-bold text-white hover:bg-sky-400 sm:flex-none sm:px-4 sm:text-sm" aria-pressed={choice === "analytics"} onClick={() => choose("analytics")}>Allow analytics</button>
        </div>
      </div>

    </div>
    <label className="mt-4 flex items-start gap-3 border-t border-white/15 pt-4 text-sm"><input type="checkbox" className="mt-1" checked={advertising} onChange={e => chooseAdvertising(e.target.checked)}/><span>Allow Google Ads measurement <span className="block text-xs leading-5 text-slate-300">Optional cookies help measure advertising performance. The base tag can send cookieless signals while this is off. This choice is separate from analytics. Personalised advertising is disabled.</span></span></label>
  </section>;
}
