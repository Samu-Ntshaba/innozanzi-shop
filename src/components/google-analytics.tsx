"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_KEY, type CookieConsentChoice } from "@/components/cookie-consent";

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
    const update = (event?: Event) => {
      const choice = event instanceof CustomEvent ? event.detail as CookieConsentChoice : window.localStorage.getItem(COOKIE_CONSENT_KEY);
      setAllowed(choice === "analytics");
    };
    update();
    window.addEventListener(COOKIE_CONSENT_EVENT, update);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, update);
  }, []);

  useEffect(() => {
    if (!allowed || !window.gtag) return;
    const query = searchParams.toString();
    window.gtag("event", "page_view", {
      page_location: window.location.href,
      page_path: query ? `${pathname}?${query}` : pathname,
      page_title: document.title,
    });
  }, [allowed, measurementId, pathname, searchParams]);

  if (!allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="lazyOnload"
      />
      <Script id="innozanzi-google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            send_page_view: true,
            anonymize_ip: true
          });
        `}
      </Script>
    </>
  );
}
