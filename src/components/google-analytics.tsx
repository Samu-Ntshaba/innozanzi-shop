"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { COOKIE_CONSENT_EVENT } from "@/components/cookie-consent";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const update = () => {
      const consent = /(?:^|; )innozanzi-consent=analytics(?:;|$)/.test(document.cookie);
      (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = !consent;
      window.gtag?.("consent", "update", { analytics_storage: consent ? "granted" : "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      setAllowed(consent);
    };
    update();
    window.addEventListener(COOKIE_CONSENT_EVENT, update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener(COOKIE_CONSENT_EVENT, update); window.removeEventListener("storage", update); };
  }, [measurementId]);

  useEffect(() => {
    if (!allowed || !window.gtag) return;

    window.gtag("event", "page_view", {
      page_location: window.location.origin + pathname,
      page_path: pathname,
      page_title: document.title,
      page_referrer: document.referrer.split(/[?#]/)[0],
    });
  }, [allowed, measurementId, pathname, searchParams]);

  if (!allowed || !/^G-[A-Z0-9]+$/.test(measurementId)) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="lazyOnload"
      />
      <Script id="innozanzi-google-analytics" strategy="lazyOnload">
        {`
          if (/(?:^|; )innozanzi-consent=analytics(?:;|$)/.test(document.cookie)) {
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            send_page_view: false,
            page_location: window.location.origin + window.location.pathname,
            page_referrer: document.referrer.split(/[?#]/)[0],
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
            anonymize_ip: true
          });
          gtag('event', 'page_view', { page_location: window.location.origin + window.location.pathname, page_path: window.location.pathname, page_title: document.title, page_referrer: document.referrer.split(/[?#]/)[0] });
          }
        `}
      </Script>
    </>
  );
}
