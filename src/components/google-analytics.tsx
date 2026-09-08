"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { COOKIE_CONSENT_EVENT } from "@/components/cookie-consent";

declare global {
  interface Window { dataLayer: unknown[]; gtag?: (...args: unknown[]) => void; }
}
const denied = { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };
export function GoogleAnalytics({ measurementId, adsId }: { measurementId: string; adsId: string }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState({ analytics: false, advertising: false });
  const ga = /^G-[A-Z0-9]+$/.test(measurementId) ? measurementId : "";
  const ads = /^AW-\d+$/.test(adsId) ? adsId : "";
  useEffect(() => {
    const update = () => {
      const analytics = /(?:^|; )innozanzi-consent=analytics(?:;|$)/.test(document.cookie);
      const advertising = /(?:^|; )innozanzi-ad-consent=granted(?:;|$)/.test(document.cookie);
      (window as unknown as Record<string, unknown>)[`ga-disable-${ga}`] = !analytics;
      if ((analytics && ga || advertising && ads) && !window.gtag) {
        window.dataLayer ||= [];
        // gtag consumes the native arguments object from its standard queue.
        // eslint-disable-next-line prefer-rest-params
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag("consent", "default", denied);
        window.gtag("set", "ads_data_redaction", true);
        window.gtag("set", "url_passthrough", false);
        window.gtag("js", new Date());
      }
      window.gtag?.("consent", "update", { analytics_storage: analytics ? "granted" : "denied", ad_storage: advertising ? "granted" : "denied", ad_user_data: advertising ? "granted" : "denied", ad_personalization: "denied" });
      setConsent(previous => previous.analytics === analytics && previous.advertising === advertising ? previous : { analytics, advertising });
    };
    update(); window.addEventListener(COOKIE_CONSENT_EVENT, update); window.addEventListener("storage", update);
    return () => { window.removeEventListener(COOKIE_CONSENT_EVENT, update); window.removeEventListener("storage", update); };
  }, [ga, ads]);
  useEffect(() => {
    if (!window.gtag) return;
    // Never send private account/order identifiers, query strings, or page titles.
    const safePath = /^\/(products|categories|gaming|policies)(\/|$)/.test(pathname) || pathname === "/" ? pathname : `/${pathname.split("/")[1]}`;
    const fields = { page_location: window.location.origin + safePath, page_referrer: "", page_title: "Innozanzi Shop", allow_google_signals: false, allow_ad_personalization_signals: false };
    if (consent.analytics && ga) {
      window.gtag("config", ga, { ...fields, send_page_view: false });
      window.gtag("event", "page_view", { ...fields, page_path: safePath, send_to: ga });
    }
    if (consent.advertising && ads) window.gtag("config", ads, fields);
  }, [consent, pathname, ga, ads]);
  const id = consent.analytics && ga || consent.advertising && ads;
  // Ads has a shared head loader; retain the consent-gated GA fallback if Ads is disabled.
  return id && !ads ? <Script id="innozanzi-google-tag" src={`https://www.googletagmanager.com/gtag/js?id=${ga || ads}`} strategy="afterInteractive"/> : null;
}
